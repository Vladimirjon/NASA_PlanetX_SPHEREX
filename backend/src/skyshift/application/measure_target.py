"""Use case: measure the apparent motion of one target across SPHEREx visits (spec 0010).

First delivery (spec 0010 §0): motion only, one detector, never EVALUATED. Pipeline:
list images (DR1+QR3) → keep one detector → per image: expected position (catalog motion +
parallax) → read ONE native-pixel box around the target → COMPARE_MASK within the IRSA
radius → Gaussian centroid of the target AND of catalog reference stars in the same box →
sky positions + covariances → field-star registration sets the per-axis WCS term (0.3 arcsec
per axis is only the provisional floor, Sebastián / spec 0034 §1) → subtract the KNOWN
parallax → fit proper motion → 2D chi-square test on mu (Sebastián's function) → neighbor,
wavelength-dependence (Ba/Bb) and sensitivity controls → outcome. Every exclusion keeps
its reason.
"""

import asyncio
import dataclasses
import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import timedelta

import numpy as np

from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations, ObservationIndex
from skyshift.application.tiered_cache import TieredResolver
from skyshift.domain.astro import julian_year
from skyshift.domain.fits_bytes import detector_pixel, image_meta, local_wavelength, spatial_wcs
from skyshift.domain.flags import COMPARE_MASK, OUTLIER_BIT, comparison_mask
from skyshift.domain.imaging import flags_clear_near
from skyshift.domain.measurement.astrometry import (
    Cov2,
    fit_centroid,
    pixel_to_sky,
    tangent_offset_arcsec,
)
from skyshift.domain.measurement.criteria import MeasurementCriteria
from skyshift.domain.measurement.motion_fit import (
    EpochOffset,
    MotionFit,
    MotionFitError,
    fit_proper_motion,
)
from skyshift.domain.measurement.registration import (
    CatalogStar,
    Neighbor,
    ReferenceSelection,
    RegistrationStats,
    WavelengthSlope,
    identify_target,
    neighbors,
    registration_stats,
    select_references,
    wavelength_slope,
)
from skyshift.domain.motion import Motion, propagate
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.domain.significance import (
    AstrometricTest,
    astrometric_p_value,
    compare_significance,
    equivalent_sigma_two_sided,
)
from skyshift.ports.reference_stars import ReferenceStarCatalog

METHOD_NAME = "native-frame-gaussian-centroid+gls-proper-motion+field-registration"
METHOD_VERSION = "0.2.0"
BOX_HALF_PX = 40  # one read per exposure covers the target and nearby reference stars
EDGE_MARGIN_PX = 15  # D12 §6.2, same as the series
QUERY_MJD = 61100.0  # same catalog query epoch as build_series
CONCURRENCY = 6
CATALOG_TTL = timedelta(days=30)
FLAG_NAMES = {
    0: "TRANSIENT", 1: "OVERFLOW", 2: "SUR_ERROR", 6: "NONFUNC", 7: "DICHROIC",
    9: "MISSING_DATA", 10: "HOT", 11: "COLD", 12: "FULLSAMPLE", 14: "PHANMISS",
    15: "NONLINEAR", 17: "PERSIST", 19: "OUTLIER", 20: "CROSSTALK", 21: "SOURCE",
    22: "GHOST", 23: "GHOST_FPA", 24: "GHOST_EXT", 25: "STREAK", 26: "BLOOM",
    27: "SNOWBALL", 28: "HALO", 29: "SATELLITE_HALO",
}  # fmt: skip


@dataclass(frozen=True, slots=True)
class FieldControls:
    """Method parameters for the field-star controls (recorded in the result)."""

    catalog_radius_arcsec: float
    selection: ReferenceSelection
    neighbor_radius_arcsec: float
    identification_radius_arcsec: float  # a reference counts only if measured this close


@dataclass(frozen=True, slots=True)
class MeasureRequest:
    label: str
    position: SkyPosition  # catalog position at motion.ref_epoch_jyear
    position_source: str
    motion: Motion | None  # catalog proper motion + parallax (prediction and parallax only)
    motion_source: str | None
    detector: int
    criteria: MeasurementCriteria
    field: FieldControls | None = None


@dataclass(frozen=True, slots=True)
class Issue:
    code: str
    severity: str  # info | warn | block
    detail: str
    observation_id: str | None = None


@dataclass(frozen=True, slots=True)
class ExposureMeasurement:
    observation: Observation
    visit_id: str
    mjd_avg: float
    x_pix: float | None
    y_pix: float | None
    ra_deg: float | None
    dec_deg: float | None
    cov_stat: Cov2 | None  # centroid only
    snr: float | None
    fwhm_px: float | None
    flags_bitmask: int
    used: bool
    excluded_reason: str | None
    wavelength_um: float | None = None  # WCS-WAVE at the measured target (selection grade)
    ref_residuals: tuple[tuple[str, float, float], ...] = ()  # (source_id, dxi, deta) arcsec
    ref_rejected: int = 0  # reference fits farther than the identification radius
    cov_pos: Cov2 | None = None  # cov_stat + applied per-axis WCS term (set by _conclude)


@dataclass(frozen=True, slots=True)
class FieldCatalog:
    name: str
    target: CatalogStar | None
    references: tuple[CatalogStar, ...]
    stars: tuple[CatalogStar, ...]


@dataclass(frozen=True, slots=True)
class Variant:
    name: str
    n_used: int
    pm_xi_arcsec_yr: float | None
    pm_eta_arcsec_yr: float | None


@dataclass(frozen=True, slots=True)
class MotionMeasurement:
    request: MeasureRequest
    index: ObservationIndex
    measurements: tuple[ExposureMeasurement, ...]
    fit: MotionFit | None
    test: AstrometricTest | None
    equivalent_sigma: float | None
    n_visits: int
    outcome: str
    issues: tuple[Issue, ...]
    applied_sigma_arcsec: tuple[float, float] = (0.0, 0.0)
    registration: RegistrationStats | None = None
    field: FieldCatalog | None = None
    close_sources: tuple[Neighbor, ...] = ()
    wavelength: WavelengthSlope | None = None
    sensitivity: tuple[Variant, ...] = ()


def flag_names(bitmask: int) -> list[str]:
    return [name for bit, name in sorted(FLAG_NAMES.items()) if bitmask & (1 << bit)]


@dataclass(frozen=True, slots=True)
class ReferenceStars:
    """Catalog cone search behind the tiered cache (validated before it is stored)."""

    resolver: TieredResolver
    catalog: ReferenceStarCatalog

    def _validate(self, data: bytes) -> None:
        self.catalog.parse(data)

    async def cone(self, center: SkyPosition, radius_arcsec: float) -> list[CatalogStar]:
        resolved = await self.resolver.get(
            self.catalog.cache_key(center, radius_arcsec),
            lambda: self.catalog.fetch(center, radius_arcsec),
            ttl=CATALOG_TTL,
            validate=self._validate,
        )
        return self.catalog.parse(resolved.data)


@dataclass(frozen=True, slots=True)
class MeasureTarget:
    list_observations: ListObservations
    frames: FrameReader
    reference_stars: ReferenceStars | None = None

    async def __call__(self, req: MeasureRequest) -> MotionMeasurement:
        query = propagate(req.position, req.motion, mjd=QUERY_MJD)
        index = await self.list_observations(query)
        jobs = [
            (visit.visit_id, obs)
            for visit in index.visits
            for obs in visit.observations
            if obs.detector == req.detector
        ]
        field = await self._field(req, query)
        refs = field.references if field else ()
        gate = asyncio.Semaphore(CONCURRENCY)

        async def one(visit_id: str, obs: Observation) -> ExposureMeasurement:
            async with gate:
                return await self._measure(req, visit_id, obs, refs)

        rows = tuple(await asyncio.gather(*(one(v, o) for v, o in jobs)))
        return _conclude(req, index, rows, field)

    async def _field(self, req: MeasureRequest, center: SkyPosition) -> FieldCatalog | None:
        if self.reference_stars is None or req.field is None:
            return None
        stars = await self.reference_stars.cone(center, req.field.catalog_radius_arcsec)
        target = identify_target(stars, req.position)
        refs = select_references(stars, target, QUERY_MJD, req.field.selection)
        return FieldCatalog(self.reference_stars.catalog.name, target, tuple(refs), tuple(stars))

    async def _measure(
        self,
        req: MeasureRequest,
        visit_id: str,
        obs: Observation,
        refs: Sequence[CatalogStar],
    ) -> ExposureMeasurement:
        def excluded(reason: str, mjd: float, flags: int = 0) -> ExposureMeasurement:
            return ExposureMeasurement(
                obs, visit_id, mjd, None, None, None, None, None, None, None, flags, False, reason
            )

        try:
            chain = await self.frames.chain(obs)
        except ValueError as exc:
            return excluded(f"data_error: {exc}", obs.t_mid_mjd)
        meta = image_meta(chain.image_header)
        if meta.finast != 0 or not meta.l2dqa_pass:
            return excluded("pipeline_quality_unexpected", meta.mjd_avg)
        expected = propagate(req.position, req.motion, mjd=meta.mjd_avg)
        x, y = detector_pixel(chain.image_header, expected.ra_deg, expected.dec_deg)
        size = chain.hdus["IMAGE"].width
        lo, hi = EDGE_MARGIN_PX, size - 1 - EDGE_MARGIN_PX
        if not (lo <= x <= hi and lo <= y <= hi):
            return excluded("target_off_footprint", meta.mjd_avg)
        bx, by = round(x) - BOX_HALF_PX, round(y) - BOX_HALF_PX
        box = await self.frames.read_box(obs, chain, bx, by, 2 * BOX_HALF_PX + 1)
        masked, _ = comparison_mask(box.flags)
        wcs = spatial_wcs(chain.image_header)
        radius = req.criteria.flag_radius_px.value
        yy, xx = np.mgrid[0 : box.flags.shape[0], 0 : box.flags.shape[1]]

        def bits_near(cx: float, cy: float) -> int:
            near = (xx - cx) ** 2 + (yy - cy) ** 2 <= radius**2
            return int(np.bitwise_or.reduce(box.flags[near].astype(np.int64) & 0xFFFFFFFF))

        bits = bits_near(x - bx, y - by)
        if not flags_clear_near(masked, (x - bx, y - by), radius):
            return excluded("bad_pixels_near_target", meta.mjd_avg, bits)
        centroid = fit_centroid(box.image, box.variance, ~masked, (x - bx, y - by))
        if centroid is None:
            return excluded("centroid_fit_failed", meta.mjd_avg, bits)
        det_x, det_y = bx + centroid.x, by + centroid.y
        ra, dec, cov_stat = pixel_to_sky(wcs, det_x, det_y, centroid.cov_px)

        residuals: list[tuple[str, float, float]] = []
        rejected = 0
        id_radius = req.field.identification_radius_arcsec if req.field else 0.0
        for star in refs:
            at = star.at(meta.mjd_avg)
            sx, sy = detector_pixel(chain.image_header, at.ra_deg, at.dec_deg)
            cx, cy = sx - bx, sy - by
            if not (5 <= cx <= 2 * BOX_HALF_PX - 5 and 5 <= cy <= 2 * BOX_HALF_PX - 5):
                continue
            if not flags_clear_near(masked, (cx, cy), radius):
                continue
            ref = fit_centroid(box.image, box.variance, ~masked, (cx, cy))
            if ref is None or ref.snr < req.criteria.min_snr_per_exposure.value:
                continue
            r_ra, r_dec, _ = pixel_to_sky(wcs, bx + ref.x, by + ref.y, ref.cov_px)
            dxi, deta = tangent_offset_arcsec(r_ra, r_dec, at.ra_deg, at.dec_deg)
            if math.hypot(dxi, deta) > id_radius:
                rejected += 1  # fitted another source: not an identification
                continue
            residuals.append((star.source_id, dxi, deta))

        try:
            wave = await self.frames.wave_table(obs)
            lam: float | None = local_wavelength(chain.image_header, wave, ra, dec).wavelength_um
        except ValueError:
            lam = None
        low = centroid.snr < req.criteria.min_snr_per_exposure.value
        return ExposureMeasurement(
            observation=obs,
            visit_id=visit_id,
            mjd_avg=meta.mjd_avg,
            x_pix=det_x,
            y_pix=det_y,
            ra_deg=ra,
            dec_deg=dec,
            cov_stat=cov_stat,
            snr=centroid.snr,
            fwhm_px=centroid.fwhm_px,
            flags_bitmask=bits,
            used=not low,
            excluded_reason="low_snr" if low else None,
            wavelength_um=lam,
            ref_residuals=tuple(residuals),
            ref_rejected=rejected,
        )


def _parallax_offset(req: MeasureRequest, mjd: float) -> tuple[float, float]:
    """Shift caused by the KNOWN parallax alone, as a tangent offset about the catalog point."""
    if req.motion is None or req.motion.parallax_mas <= 0:
        return 0.0, 0.0
    only_parallax = Motion(0.0, 0.0, req.motion.parallax_mas, req.motion.ref_epoch_jyear)
    shifted = propagate(req.position, only_parallax, mjd=mjd)
    return tangent_offset_arcsec(
        shifted.ra_deg, shifted.dec_deg, req.position.ra_deg, req.position.dec_deg
    )


def epoch_offset(req: MeasureRequest, r: ExposureMeasurement) -> EpochOffset:
    """Parallax-corrected tangent offset of one measurement about the catalog position."""
    assert r.ra_deg is not None
    assert r.dec_deg is not None
    assert r.cov_pos is not None
    xi, eta = tangent_offset_arcsec(r.ra_deg, r.dec_deg, req.position.ra_deg, req.position.dec_deg)
    pxi, peta = _parallax_offset(req, r.mjd_avg)
    return EpochOffset(julian_year(r.mjd_avg), xi - pxi, eta - peta, r.cov_pos)


def _with_wcs_term(
    rows: Sequence[ExposureMeasurement], sx: float, sy: float
) -> tuple[ExposureMeasurement, ...]:
    out: list[ExposureMeasurement] = []
    for r in rows:
        if r.cov_stat is None:
            out.append(r)
            continue
        (a, b), (c, d) = r.cov_stat
        out.append(dataclasses.replace(r, cov_pos=((a + sx**2, b), (c, d + sy**2))))
    return tuple(out)


def _fit_rows(req: MeasureRequest, rows: Sequence[ExposureMeasurement]) -> MotionFit | None:
    if len({r.visit_id for r in rows}) < 2:
        return None
    try:
        return fit_proper_motion([epoch_offset(req, r) for r in rows])
    except MotionFitError:
        return None


def _sensitivity(req: MeasureRequest, used: Sequence[ExposureMeasurement]) -> tuple[Variant, ...]:
    variants: list[tuple[str, list[ExposureMeasurement]]] = [
        ("without_outlier_flag", [r for r in used if not r.flags_bitmask & (1 << OUTLIER_BIT)])
    ]
    for visit in sorted({r.visit_id for r in used}):
        variants.append((f"without_visit_{visit}", [r for r in used if r.visit_id != visit]))
    out: list[Variant] = []
    for name, subset in variants:
        fit = _fit_rows(req, subset)
        out.append(
            Variant(
                name,
                len(subset),
                fit.pm_xi_arcsec_yr if fit else None,
                fit.pm_eta_arcsec_yr if fit else None,
            )
        )
    return tuple(out)


def _conclude(
    req: MeasureRequest,
    index: ObservationIndex,
    rows: tuple[ExposureMeasurement, ...],
    field: FieldCatalog | None = None,
) -> MotionMeasurement:
    issues: list[Issue] = []
    for row in rows:
        obs_id = row.observation.obs_did
        if row.excluded_reason is not None:
            code = row.excluded_reason.split(":")[0]
            issues.append(Issue(code, "block", f"exposure excluded: {row.excluded_reason}", obs_id))
        elif row.flags_bitmask & (1 << OUTLIER_BIT):
            issues.append(Issue("outlier_near_target", "warn", "OUTLIER bit within radius", obs_id))

    provisional = req.criteria.sigma_wcs_arcsec_per_axis.value
    used0 = [r for r in rows if r.used]
    registration = registration_stats({r.observation.obs_did: list(r.ref_residuals) for r in used0})
    if registration is None:
        sx = sy = provisional
        issues.append(
            Issue(
                "registration_unverified",
                "warn",
                f"{provisional} arcsec per axis WCS term not checked against field stars (A5)",
            )
        )
    else:
        sx = max(provisional, registration.rms_xi_arcsec)
        sy = max(provisional, registration.rms_eta_arcsec)
        summary = (
            f"field stars: {registration.n_reference_stars} stars, "
            f"{registration.n_exposures} exposures; per-exposure offset scatter "
            f"{registration.rms_xi_arcsec:.3f}/{registration.rms_eta_arcsec:.3f} arcsec "
            f"(RA*cosDec/Dec), bias {registration.bias_xi_arcsec:+.3f}/"
            f"{registration.bias_eta_arcsec:+.3f} arcsec"
        )
        if sx > provisional or sy > provisional:
            issues.append(
                Issue(
                    "uncertainty_inflated",
                    "warn",
                    f"{summary}; WCS term raised to {sx:.3f}/{sy:.3f} arcsec",
                )
            )
        else:
            issues.append(
                Issue(
                    "registration_checked",
                    "info",
                    f"{summary}; within the provisional {provisional} arcsec per axis",
                )
            )
    rows = _with_wcs_term(rows, sx, sy)
    used = [r for r in rows if r.used]
    visits = {r.visit_id for r in used}

    close: tuple[Neighbor, ...] = ()
    if field is not None and req.field is not None:
        mjds = [r.mjd_avg for r in used]
        close = tuple(
            neighbors(
                field.stars,
                field.target,
                [propagate(req.position, req.motion, mjd=m) for m in mjds],
                mjds,
                req.field.neighbor_radius_arcsec,
            )
        )
        if close:
            listed = ", ".join(
                f"{n.source_id} (G={n.g_mag}, {n.min_separation_arcsec:.1f} arcsec)" for n in close
            )
            issues.append(
                Issue(
                    "neighbor_confusion",
                    "warn",
                    f"catalog sources within {req.field.neighbor_radius_arcsec:.1f} arcsec: "
                    f"{listed}",
                )
            )

    issues.append(
        Issue(
            "assumptions_unverified",
            "warn",
            "Gaussian errors and covariance not independently verified (A4): no change_measured",
        )
    )
    if req.motion is None or req.motion.parallax_mas <= 0:
        issues.append(Issue("parallax_not_modeled", "warn", "no catalog parallax to subtract"))

    def done(
        outcome: str,
        fit: MotionFit | None = None,
        test: AstrometricTest | None = None,
        z: float | None = None,
        lam: WavelengthSlope | None = None,
        sens: tuple[Variant, ...] = (),
    ) -> MotionMeasurement:
        return MotionMeasurement(
            req, index, rows, fit, test, z, len(visits), outcome, tuple(issues),
            (sx, sy), registration, field, close, lam, sens,
        )  # fmt: skip

    if len(visits) < 2:
        issues.append(Issue("insufficient_epochs", "block", f"{len(visits)} usable visit(s)"))
        return done("no_usable_detection" if not used else "not_evaluable")

    try:
        fit = fit_proper_motion([epoch_offset(req, r) for r in used])
    except MotionFitError as exc:
        issues.append(Issue("data_error", "block", str(exc)))
        return done("not_evaluable")
    if fit.scaled:
        issues.append(
            Issue(
                "uncertainty_inflated",
                "info",
                f"chi2/dof = {fit.chi2 / fit.dof:.2f} > 1: motion covariance scaled up",
            )
        )

    with_lam = [(r, res) for r, res in zip(used, fit.residuals, strict=True) if r.wavelength_um]
    lam = wavelength_slope(
        [r.wavelength_um for r, _ in with_lam if r.wavelength_um is not None],
        [res for _, res in with_lam],
        [
            (math.sqrt(r.cov_pos[0][0]), math.sqrt(r.cov_pos[1][1]))
            for r, _ in with_lam
            if r.cov_pos is not None
        ],
    )
    if lam is None:
        detail = "position vs wavelength not testable (Ba/Bb photocenter, C6)"
    else:
        detail = (
            f"residual slope vs wavelength ({lam.wavelength_min_um:.3f}-"
            f"{lam.wavelength_max_um:.3f} um, n={lam.n}): "
            f"RA*cosDec {lam.slope_xi_arcsec_per_um:+.3f} +/- {lam.sigma_slope_xi:.3f}, "
            f"Dec {lam.slope_eta_arcsec_per_um:+.3f} +/- {lam.sigma_slope_eta:.3f} arcsec/um; "
            "acceptability is a science decision (C6)"
        )
    issues.append(Issue("wavelength_dependent_position", "warn", detail))
    sens = _sensitivity(req, used)

    test = astrometric_p_value((fit.pm_xi_arcsec_yr, fit.pm_eta_arcsec_yr), fit.cov_pm)
    z = equivalent_sigma_two_sided(test.p_value) if test else None
    if test is None:
        verdict = "unknown"
    elif test.p_value > 0:
        verdict = compare_significance(
            test.p_value, req.criteria.min_significance_sigma_two_sided.value, 1
        )
    else:
        # p underflowed to 0 (Q > ~1490): compare Q with the computed threshold instead,
        # which is the same rule (p <= p* <=> Q >= -2 ln p*).
        above = test.statistic >= req.criteria.q_threshold_2dof
        verdict = "above_threshold" if above else "below_threshold"
    if test is None or verdict == "unknown":
        outcome = "not_evaluable"
    elif verdict == "above_threshold":
        # A4: above the threshold but with unverified assumptions -> never change_measured.
        outcome = "threshold_exceeded_unverified"
    else:
        outcome = "change_below_criterion"
    return done(outcome, fit, test, z, lam, sens)


@dataclass(frozen=True, slots=True)
class PairResult:
    a: ExposureMeasurement
    b: ExposureMeasurement
    delta_xi_arcsec: float
    delta_eta_arcsec: float
    cov: Cov2
    test: AstrometricTest | None


def pair_displacement(
    req: MeasureRequest, a: ExposureMeasurement, b: ExposureMeasurement
) -> PairResult:
    """Two-epoch difference (B - A), parallax removed, C = C_A + C_B (independent epochs)."""
    ea, eb = epoch_offset(req, a), epoch_offset(req, b)
    dxi, deta = eb.xi_arcsec - ea.xi_arcsec, eb.eta_arcsec - ea.eta_arcsec
    cov: Cov2 = (
        (ea.cov[0][0] + eb.cov[0][0], ea.cov[0][1] + eb.cov[0][1]),
        (ea.cov[1][0] + eb.cov[1][0], ea.cov[1][1] + eb.cov[1][1]),
    )
    return PairResult(a, b, dxi, deta, cov, astrometric_p_value((dxi, deta), cov))


def separation_and_pa(dxi: float, deta: float) -> tuple[float, float]:
    return math.hypot(dxi, deta), math.degrees(math.atan2(dxi, deta)) % 360.0


__all__ = ["COMPARE_MASK", "MeasureRequest", "MeasureTarget", "MotionMeasurement", "flag_names"]
