"""Use case: measure the apparent motion of one target across SPHEREx visits (spec 0010).

First delivery (spec 0010 §0): motion only, one detector, never EVALUATED. Pipeline:
list images (DR1+QR3) → keep one detector → per image: expected position (catalog motion +
parallax) → read a small native-pixel box → COMPARE_MASK within the IRSA radius → Gaussian
centroid → sky position + covariance (stat + provisional WCS term) → subtract the KNOWN
parallax → fit proper motion over all usable exposures → 2D χ² test on μ (Sebastián's
function) → outcome. Every exclusion is kept with its reason.
"""

import asyncio
import math
from dataclasses import dataclass

import numpy as np

from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations, ObservationIndex
from skyshift.domain.astro import julian_year
from skyshift.domain.fits_bytes import detector_pixel, image_meta, spatial_wcs
from skyshift.domain.flags import COMPARE_MASK, OUTLIER_BIT, comparison_mask
from skyshift.domain.imaging import flags_clear_near
from skyshift.domain.measurement.astrometry import (
    Cov2,
    add_isotropic,
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
from skyshift.domain.motion import Motion, propagate
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.domain.significance import (
    AstrometricTest,
    astrometric_p_value,
    compare_significance,
    equivalent_sigma_two_sided,
)

METHOD_NAME = "native-frame-gaussian-centroid+gls-proper-motion"
METHOD_VERSION = "0.1.0"
BOX_HALF_PX = 6
EDGE_MARGIN_PX = 15  # D12 §6.2, same as the series
QUERY_MJD = 61100.0  # same catalog query epoch as build_series
CONCURRENCY = 8
FLAG_NAMES = {
    0: "TRANSIENT", 1: "OVERFLOW", 2: "SUR_ERROR", 6: "NONFUNC", 7: "DICHROIC",
    9: "MISSING_DATA", 10: "HOT", 11: "COLD", 12: "FULLSAMPLE", 14: "PHANMISS",
    15: "NONLINEAR", 17: "PERSIST", 19: "OUTLIER", 20: "CROSSTALK", 21: "SOURCE",
    22: "GHOST", 23: "GHOST_FPA", 24: "GHOST_EXT", 25: "STREAK", 26: "BLOOM",
    27: "SNOWBALL", 28: "HALO", 29: "SATELLITE_HALO",
}  # fmt: skip


@dataclass(frozen=True, slots=True)
class MeasureRequest:
    label: str
    position: SkyPosition  # catalog position at motion.ref_epoch_jyear
    position_source: str
    motion: Motion | None  # catalog proper motion + parallax (used for prediction/parallax)
    motion_source: str | None
    detector: int
    criteria: MeasurementCriteria


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
    cov_pos: Cov2 | None
    snr: float | None
    fwhm_px: float | None
    flags_bitmask: int
    used: bool
    excluded_reason: str | None


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


def flag_names(bitmask: int) -> list[str]:
    return [name for bit, name in sorted(FLAG_NAMES.items()) if bitmask & (1 << bit)]


@dataclass(frozen=True, slots=True)
class MeasureTarget:
    list_observations: ListObservations
    frames: FrameReader

    async def __call__(self, req: MeasureRequest) -> MotionMeasurement:
        query = propagate(req.position, req.motion, mjd=QUERY_MJD)
        index = await self.list_observations(query)
        jobs = [
            (visit.visit_id, obs)
            for visit in index.visits
            for obs in visit.observations
            if obs.detector == req.detector
        ]
        gate = asyncio.Semaphore(CONCURRENCY)

        async def one(visit_id: str, obs: Observation) -> ExposureMeasurement:
            async with gate:
                return await self._measure(req, visit_id, obs)

        rows = tuple(await asyncio.gather(*(one(v, o) for v, o in jobs)))
        return _conclude(req, index, rows)

    async def _measure(
        self, req: MeasureRequest, visit_id: str, obs: Observation
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
        masked, outlier = comparison_mask(box.flags)
        radius = req.criteria.flag_radius_px.value
        yy, xx = np.mgrid[0 : box.flags.shape[0], 0 : box.flags.shape[1]]
        near = (xx - (x - bx)) ** 2 + (yy - (y - by)) ** 2 <= radius**2
        bits = int(np.bitwise_or.reduce(box.flags[near].astype(np.int64) & 0xFFFFFFFF))
        if not flags_clear_near(masked, (x - bx, y - by), radius):
            return excluded("bad_pixels_near_target", meta.mjd_avg, bits)

        centroid = fit_centroid(box.image, box.variance, ~masked, (x - bx, y - by))
        if centroid is None:
            return excluded("centroid_fit_failed", meta.mjd_avg, bits)
        det_x, det_y = bx + centroid.x, by + centroid.y
        ra, dec, cov_stat = pixel_to_sky(
            spatial_wcs(chain.image_header), det_x, det_y, centroid.cov_px
        )
        cov = add_isotropic(cov_stat, req.criteria.sigma_wcs_arcsec_per_axis.value)
        if centroid.snr < req.criteria.min_snr_per_exposure.value:
            reason = "low_snr"
        elif bool(outlier[near].any()):
            reason = None  # kept, but reported as outlier_near_target (R8)
        else:
            reason = None
        return ExposureMeasurement(
            observation=obs,
            visit_id=visit_id,
            mjd_avg=meta.mjd_avg,
            x_pix=det_x,
            y_pix=det_y,
            ra_deg=ra,
            dec_deg=dec,
            cov_pos=cov,
            snr=centroid.snr,
            fwhm_px=centroid.fwhm_px,
            flags_bitmask=bits,
            used=reason is None,
            excluded_reason=reason,
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


def _conclude(
    req: MeasureRequest, index: ObservationIndex, rows: tuple[ExposureMeasurement, ...]
) -> MotionMeasurement:
    issues: list[Issue] = []
    for row in rows:
        obs_id = row.observation.obs_did
        if row.excluded_reason is not None:
            code = row.excluded_reason.split(":")[0]
            issues.append(Issue(code, "block", f"exposure excluded: {row.excluded_reason}", obs_id))
        elif row.flags_bitmask & (1 << OUTLIER_BIT):
            issues.append(Issue("outlier_near_target", "warn", "OUTLIER bit within radius", obs_id))

    used = [r for r in rows if r.used]
    visits = {r.visit_id for r in used}
    issues += [
        Issue(
            "registration_unverified",
            "warn",
            "0.3 arcsec per axis WCS term not yet checked against field reference stars (A5)",
        ),
        Issue(
            "wavelength_dependent_position",
            "warn",
            "Ba/Bb photocenter vs wavelength not tested in the first delivery (C6)",
        ),
        Issue(
            "assumptions_unverified",
            "warn",
            "Gaussian errors and covariance not independently verified (A4): no change_measured",
        ),
    ]
    if req.motion is None or req.motion.parallax_mas <= 0:
        issues.append(Issue("parallax_not_modeled", "warn", "no catalog parallax to subtract"))

    if len(visits) < 2:
        issues.append(Issue("insufficient_epochs", "block", f"{len(visits)} usable visit(s)"))
        outcome = "no_usable_detection" if not used else "not_evaluable"
        return MotionMeasurement(
            req, index, rows, None, None, None, len(visits), outcome, tuple(issues)
        )

    epochs: list[EpochOffset] = []
    for r in used:
        assert r.ra_deg is not None
        assert r.dec_deg is not None
        assert r.cov_pos is not None
        xi, eta = tangent_offset_arcsec(
            r.ra_deg, r.dec_deg, req.position.ra_deg, req.position.dec_deg
        )
        pxi, peta = _parallax_offset(req, r.mjd_avg)
        epochs.append(EpochOffset(julian_year(r.mjd_avg), xi - pxi, eta - peta, r.cov_pos))
    try:
        fit = fit_proper_motion(epochs)
    except MotionFitError as exc:
        issues.append(Issue("data_error", "block", str(exc)))
        return MotionMeasurement(
            req, index, rows, None, None, None, len(visits), "not_evaluable", tuple(issues)
        )
    if fit.scaled:
        issues.append(
            Issue(
                "uncertainty_inflated",
                "info",
                f"chi2/dof = {fit.chi2 / fit.dof:.2f} > 1: motion covariance scaled up",
            )
        )
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
        # which is the same rule (p ≤ p* ⇔ Q ≥ -2 ln p*).
        above = test.statistic >= req.criteria.q_threshold_2dof
        verdict = "above_threshold" if above else "below_threshold"
    if test is None or verdict == "unknown":
        outcome = "not_evaluable"
    elif verdict == "above_threshold":
        # A4: above the threshold but with unverified assumptions -> never change_measured.
        outcome = "threshold_exceeded_unverified"
    else:
        outcome = "change_below_criterion"
    return MotionMeasurement(req, index, rows, fit, test, z, len(visits), outcome, tuple(issues))


def separation_and_pa(dxi: float, deta: float) -> tuple[float, float]:
    return math.hypot(dxi, deta), math.degrees(math.atan2(dxi, deta)) % 360.0


__all__ = ["COMPARE_MASK", "MeasureRequest", "MeasureTarget", "MotionMeasurement", "flag_names"]
