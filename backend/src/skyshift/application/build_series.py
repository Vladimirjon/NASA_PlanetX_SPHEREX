"""Use case: build a temporal SPHEREx series for any sky position (spec 0002, D12 §6).

Pipeline: list images (DR1+QR3) → visits (>45 d) → per detector, local λ at the
propagated target for every candidate → one image per visit within λ/(4R) of a common
reference → read only the needed bytes → mask (COMPARE_MASK) → IMAGE - ZODI - local
median → reproject to a common north-up grid → NaN where λ drifts beyond tolerance →
checks → traffic light (OBSERVED unless every check passes; never CONFIRMED).
"""

import asyncio
import dataclasses
import hashlib
import json
import math
from collections import Counter
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations, ObservationIndex
from skyshift.application.tiered_cache import UpstreamUnavailable
from skyshift.domain.comparability import Check, Level, interpretation_level
from skyshift.domain.fits_bytes import (
    detector_pixel,
    image_meta,
    local_wavelength,
    spatial_wcs,
    wavelength_map,
)
from skyshift.domain.flags import comparison_mask
from skyshift.domain.imaging import (
    GridSpec,
    box_wcs,
    flags_clear_near,
    grid_for,
    grid_wcs_world_to_pixel,
    reproject,
    reproject_mask,
    subtract_background,
    union_percentiles,
)
from skyshift.domain.motion import Motion, propagate
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.domain.visits import Visit
from skyshift.domain.wavelength import Candidate, Chosen, Rejection, select_series
from skyshift.ports.origin import InvalidPayload, OriginError, OriginNotFound

PIPELINE_VERSION = "0.2.0"
EDGE_MARGIN_PX = 15  # D12 §6.2
QUERY_MJD = 61100.0  # 2026-02: middle of the DR1+QR3 span, for the catalog query position
FETCH_ERRORS = (OriginError, OriginNotFound, UpstreamUnavailable, InvalidPayload, ValueError)
F32 = npt.NDArray[np.float32]


@dataclass(frozen=True, slots=True)
class SeriesRequest:
    position: SkyPosition
    fov_arcmin: float = 5.0
    detector: int | None = None
    wavelength_um: float | None = None
    motion: Motion | None = None

    def series_id(self) -> str:
        payload = json.dumps(
            [
                round(self.position.ra_deg, 6),
                round(self.position.dec_deg, 6),
                self.fov_arcmin,
                self.detector,
                self.wavelength_um,
                None
                if self.motion is None
                else [
                    self.motion.pm_ra_masyr,
                    self.motion.pm_dec_masyr,
                    self.motion.parallax_mas,
                    self.motion.ref_epoch_jyear,
                ],
                PIPELINE_VERSION,
            ]
        )
        return hashlib.sha256(payload.encode()).hexdigest()[:24]


@dataclass(frozen=True, slots=True)
class Frame:
    index: int
    visit: Visit
    observation: Observation
    mjd_avg: float
    wavelength_um: float
    bandwidth_um: float
    delta_nm: float
    survey_epa_deg: int
    predicted: SkyPosition
    unit: str
    data: F32
    masked_fraction: float
    flags_clear_at_target: bool
    background_mjy_sr: float


@dataclass(frozen=True, slots=True)
class SeriesResult:
    series_id: str
    request: SeriesRequest
    grid: GridSpec
    detector: int | None
    reference_um: float | None
    tolerance_nm: float | None
    frames: tuple[Frame, ...]
    rejected: tuple[Rejection, ...]
    checks: tuple[Check, ...]
    level: Level
    stretch: tuple[float, float, float]
    warnings: tuple[str, ...]
    index: ObservationIndex


@dataclass(frozen=True, slots=True)
class _Probe:
    observation: Observation
    image_header: bytes
    wave_table: bytes
    wavelength_um: float
    bandwidth_um: float
    mjd_avg: float
    survey_epa_deg: int
    unit: str
    predicted: SkyPosition


@dataclass(frozen=True, slots=True)
class BuildSeries:
    list_observations: ListObservations
    reader: FrameReader

    async def __call__(self, request: SeriesRequest) -> SeriesResult:
        warnings: list[str] = []
        if request.motion is None:
            warnings.append(
                "No proper motion given: fixed position; fast-moving objects may leave the cutout."
            )
        query_pos = propagate(request.position, request.motion, mjd=QUERY_MJD)
        index = await self.list_observations(query_pos)
        warnings += [
            f"Visit {v.visit_id} lasts {v.duration_days:.0f} days (near an ecliptic pole)."
            for v in index.visits
            if v.long_visit
        ]
        detector = request.detector or _best_detector(index.visits)
        if detector is None:
            return self._empty(request, index, warnings)

        rejected: list[Rejection] = []
        probes = await self._probe_all(request, index.visits, detector, rejected)
        candidates = {
            v.visit_id: [
                Candidate(p.observation, p.wavelength_um)
                for p in probes
                if p.observation in v.observations
            ]
            for v in index.visits
        }
        selection = select_series(
            index.visits, candidates, detector=detector, reference_um=request.wavelength_um
        )
        rejected += selection.rejected
        if not selection.chosen or selection.reference_um is None or selection.tolerance_nm is None:
            return self._empty(request, index, warnings, detector, tuple(rejected))

        by_obs = {p.observation.obs_did: p for p in probes}
        chosen = [(c, by_obs[c.observation.obs_did]) for c in selection.chosen]
        center = _mean_position([p.predicted for _, p in chosen])
        spec = grid_for(center.ra_deg, center.dec_deg, request.fov_arcmin)
        built = await asyncio.gather(
            *(
                self._frame(i, c, p, spec, selection.reference_um, selection.tolerance_nm)
                for i, (c, p) in enumerate(chosen)
            ),
            return_exceptions=True,
        )
        frames: list[Frame] = []
        for (c, _), item in zip(chosen, built, strict=True):
            if isinstance(item, Frame):
                frames.append(item)
            elif isinstance(item, FETCH_ERRORS):
                rejected.append(Rejection(c.observation.obs_did, "fetch_failed", str(item)))
            else:
                raise item
        frames = [_reindex(f, i) for i, f in enumerate(frames)]
        checks = _checks(frames, selection.tolerance_nm)
        return SeriesResult(
            series_id=request.series_id(),
            request=request,
            grid=spec,
            detector=detector,
            reference_um=selection.reference_um,
            tolerance_nm=selection.tolerance_nm,
            frames=tuple(frames),
            rejected=tuple(rejected),
            checks=checks,
            level=interpretation_level(checks),
            stretch=union_percentiles([f.data for f in frames]),
            warnings=tuple(warnings),
            index=index,
        )

    async def _probe_all(
        self,
        request: SeriesRequest,
        visits: tuple[Visit, ...],
        detector: int,
        rejected: list[Rejection],
    ) -> list[_Probe]:
        observations = [o for v in visits for o in v.observations if o.detector == detector]
        results = await asyncio.gather(
            *(self._probe(request, o) for o in observations), return_exceptions=True
        )
        probes: list[_Probe] = []
        for obs, result in zip(observations, results, strict=True):
            if isinstance(result, _Probe):
                probes.append(result)
            elif isinstance(result, Rejection):
                rejected.append(result)
            elif isinstance(result, FETCH_ERRORS):
                rejected.append(Rejection(obs.obs_did, "fetch_failed", str(result)))
            else:
                raise result
        return probes

    async def _probe(self, request: SeriesRequest, obs: Observation) -> _Probe | Rejection:
        header, _ = await self.reader.image_header(obs)
        meta = image_meta(header)
        if meta.finast != 0 or not meta.l2dqa_pass:
            return Rejection(
                obs.obs_did, "quality_flag", f"FINAST={meta.finast}, L2DQA pass={meta.l2dqa_pass}"
            )
        predicted = propagate(request.position, request.motion, mjd=meta.mjd_avg)
        wave = await self.reader.wave_table(obs)
        lam = local_wavelength(header, wave, predicted.ra_deg, predicted.dec_deg)
        inside = (
            EDGE_MARGIN_PX <= lam.x <= meta.naxis1 - 1 - EDGE_MARGIN_PX
            and EDGE_MARGIN_PX <= lam.y <= meta.naxis2 - 1 - EDGE_MARGIN_PX
        )
        if not inside:
            return Rejection(
                obs.obs_did,
                "near_detector_edge",
                f"target at pixel ({lam.x:.0f}, {lam.y:.0f}), < {EDGE_MARGIN_PX} px from edge",
            )
        return _Probe(
            obs,
            header,
            wave,
            lam.wavelength_um,
            lam.bandwidth_um,
            meta.mjd_avg,
            meta.survey_epa_deg,
            meta.bunit,
            predicted,
        )

    async def _frame(
        self,
        index: int,
        chosen: Chosen,
        probe: _Probe,
        spec: GridSpec,
        ref_um: float,
        tol_nm: float,
    ) -> Frame:
        obs = probe.observation
        chain = await self.reader.chain(obs)
        full = spatial_wcs(probe.image_header)
        x, y = detector_pixel(probe.image_header, spec.ra_deg, spec.dec_deg)
        size = math.ceil(spec.size * 1.5) + 6  # covers the rotated grid (√2) plus margin
        x0, y0 = round(x) - size // 2, round(y) - size // 2
        box = await self.reader.read_box(obs, chain, x0, y0, size)

        masked, _outlier = comparison_mask(box.flags)
        bad = masked | ~np.isfinite(box.image) | ~np.isfinite(box.zodi)
        sky, background = subtract_background(box.image, box.zodi, ~bad)
        sky[bad] = np.nan
        source = box_wcs(full, x0, y0, size, size)
        data = reproject(sky, source, spec)
        bad_grid = reproject_mask(bad, source, spec)
        lam_box = wavelength_map(probe.image_header, probe.wave_table, x0, y0, size, size)
        lam_grid = reproject(lam_box, source, spec)
        drift = ~np.isfinite(lam_grid) | (np.abs(lam_grid - ref_um) * 1000 > tol_nm)
        data[bad_grid | drift] = np.nan
        tx, ty = grid_wcs_world_to_pixel(spec, probe.predicted.ra_deg, probe.predicted.dec_deg)
        return Frame(
            index=index,
            visit=chosen.visit,
            observation=obs,
            mjd_avg=probe.mjd_avg,
            wavelength_um=probe.wavelength_um,
            bandwidth_um=probe.bandwidth_um,
            delta_nm=chosen.delta_nm,
            survey_epa_deg=probe.survey_epa_deg,
            predicted=probe.predicted,
            unit=probe.unit or "MJy/sr",
            data=data,
            masked_fraction=float(np.mean(~np.isfinite(data))),
            flags_clear_at_target=flags_clear_near(bad_grid, (tx, ty)),
            background_mjy_sr=background,
        )

    def _empty(
        self,
        request: SeriesRequest,
        index: ObservationIndex,
        warnings: list[str],
        detector: int | None = None,
        rejected: tuple[Rejection, ...] = (),
    ) -> SeriesResult:
        spec = grid_for(request.position.ra_deg, request.position.dec_deg, request.fov_arcmin)
        if not index.visits:
            warnings.append("SPHEREx has no published images covering this position yet.")
        return SeriesResult(
            request.series_id(),
            request,
            spec,
            detector,
            None,
            None,
            (),
            rejected,
            (),
            "OBSERVED",
            (math.nan, math.nan, math.nan),
            tuple(warnings),
            index,
        )


def _best_detector(visits: tuple[Visit, ...]) -> int | None:
    """Detector present in the most visits (ties → lowest number). The UI lets users change it."""
    counts = Counter(d for v in visits for d in {o.detector for o in v.observations})
    if not counts:
        return None
    return min(counts, key=lambda d: (-counts[d], d))


def _mean_position(points: list[SkyPosition]) -> SkyPosition:
    vec = np.zeros(3)
    for p in points:
        ra, dec = math.radians(p.ra_deg), math.radians(p.dec_deg)
        vec += (math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec))
    x, y, z = vec / np.linalg.norm(vec)
    return SkyPosition(math.degrees(math.atan2(y, x)) % 360.0, math.degrees(math.asin(z)))


def _reindex(frame: Frame, index: int) -> Frame:
    return dataclasses.replace(frame, index=index)


def _checks(frames: list[Frame], tol_nm: float) -> tuple[Check, ...]:
    visits = {f.visit.visit_id for f in frames}
    worst = max((f.delta_nm for f in frames), default=math.inf)
    clear = [f.index for f in frames if not f.flags_clear_at_target]
    return (
        Check(
            "distinct_visits", len(visits) >= 2, f"{len(visits)} visit(s) separated by > 45 days"
        ),
        Check("same_detector", len({f.observation.detector for f in frames}) == 1, "one detector"),
        Check(
            "wavelength_within_tolerance",
            worst <= tol_nm,
            f"max |delta lambda| {worst:.1f} nm <= {tol_nm:.1f} nm",
        ),
        Check("quality_flags", True, "FINAST = 0 and L2DQA = Pass for every frame"),
        Check(
            "flags_clear_at_target",
            not clear,
            "no masked pixel within 2.5 px of the target"
            if not clear
            else f"masked pixels near target in frame(s) {clear}",
        ),
        Check("aligned_to_common_grid", True, "TAN north-up 6.15 arcsec/px, bilinear"),
        Check(
            "change_significance",
            False,
            "not computed in pipeline 0.2 (needs |z| >= 5 at target): level stays OBSERVED",
        ),
    )
