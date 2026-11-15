"""Serialize a MotionMeasurement to contracts/analysis-result.schema.json (DRAFT 0.1)."""

import math
from datetime import UTC, datetime
from importlib.metadata import version
from typing import Any

from skyshift.application.measure_target import (
    METHOD_NAME,
    METHOD_VERSION,
    MotionMeasurement,
    flag_names,
    separation_and_pa,
)
from skyshift.domain.flags import COMPARE_MASK
from skyshift.domain.measurement.criteria import Threshold

ARCSEC_PER_MAS = 1e-3


def _utc(ts: datetime) -> str:
    return ts.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _cov(c: tuple[tuple[float, float], tuple[float, float]]) -> list[list[float]]:
    return [[c[0][0], c[0][1]], [c[1][0], c[1][1]]]


def analysis_result_json(
    m: MotionMeasurement,
    *,
    analysis_id: str,
    code_ref: str | None,
    is_synthetic: bool = False,
    now: datetime | None = None,
) -> dict[str, Any]:
    req = m.request
    crit = req.criteria
    executed = _utc(now or datetime.now(UTC))
    motion = req.motion
    astrometry: dict[str, Any] | None = None
    if m.fit is not None:
        fit = m.fit
        span = fit.time_span_yr
        dxi, deta = fit.pm_xi_arcsec_yr * span, fit.pm_eta_arcsec_yr * span
        sep, pa = separation_and_pa(dxi, deta)
        s2 = span**2
        ref_cmp: dict[str, Any] | None = None
        if motion is not None and req.motion_source:
            ref_cmp = {
                "source": req.motion_source,
                "object_relation": "photocenter_of_unresolved_pair",
                "delta_pm_ra_cosdec_arcsec_per_yr": fit.pm_xi_arcsec_yr
                - motion.pm_ra_masyr * ARCSEC_PER_MAS,
                "delta_pm_dec_arcsec_per_yr": fit.pm_eta_arcsec_yr
                - motion.pm_dec_masyr * ARCSEC_PER_MAS,
                "independence_note": (
                    "Not independent: SPHEREx WCS is calibrated against Gaia DR3; the catalog "
                    "parallax is also used to correct the positions. Contrast only."
                ),
            }
        astrometry = {
            "model": "linear_fit_known_parallax",
            "n_visits": m.n_visits,
            "time_span_days": span * 365.25,
            "proper_motion": {
                "pm_ra_cosdec_arcsec_per_yr": fit.pm_xi_arcsec_yr,
                "pm_dec_arcsec_per_yr": fit.pm_eta_arcsec_yr,
                "cov_arcsec2_per_yr2": _cov(fit.cov_pm),
            },
            "displacement": {
                "delta_ra_cosdec_arcsec": dxi,
                "delta_dec_arcsec": deta,
                "separation_arcsec": sep,
                "position_angle_deg": pa,
                "cov_arcsec2": [[v * s2 for v in row] for row in _cov(fit.cov_pm)],
            },
            "test": None
            if m.test is None
            else {
                "statistic": "chi2",
                "value": m.test.statistic,
                "dof": 2,
                "p_value": m.test.p_value,
                "equivalent_sigma_two_sided": m.equivalent_sigma,
                "tested_quantity": "proper_motion",
            },
            "covariance_assumption": "independent_epochs",
            "fit_residual_rms_arcsec": fit.residual_rms_arcsec,
            "reference_comparison": ref_cmp,
            "reference_star_check": None,
        }

    measurements: list[dict[str, Any]] = [
        {
            "observation_id": r.observation.obs_did,
            "visit_id": r.visit_id,
            "time_mjd_utc": r.mjd_avg,
            "x_pix": r.x_pix,
            "y_pix": r.y_pix,
            "ra_deg": r.ra_deg,
            "dec_deg": r.dec_deg,
            "cov_pos_arcsec2": None if r.cov_pos is None else _cov(r.cov_pos),
            "snr": r.snr,
            "fwhm_px": r.fwhm_px,
            "flags_bitmask": r.flags_bitmask,
            "flag_names": flag_names(r.flags_bitmask),
            "used": r.used,
            "excluded_reason": r.excluded_reason,
        }
        for r in sorted(m.measurements, key=lambda r: (r.mjd_avg, r.observation.obs_did))
    ]
    issues: list[dict[str, Any]] = [
        {
            "code": i.code,
            "severity": i.severity,
            "detail": i.detail,
            "observation_id": i.observation_id,
        }
        for i in m.issues
    ]
    if is_synthetic:
        issues.append(
            {
                "code": "synthetic_data",
                "severity": "info",
                "detail": "test fixture",
                "observation_id": None,
            }
        )

    return {
        "schema_version": "0.1-draft",
        "analysis_id": analysis_id,
        "created_utc": executed,
        "kind": "astrometric_shift",
        "is_synthetic": is_synthetic,
        "target": {
            "label": req.label,
            "reference_position": {
                "ra_deg": req.position.ra_deg,
                "dec_deg": req.position.dec_deg,
                "frame": "ICRS",
                "epoch_jyear": motion.ref_epoch_jyear if motion else 2016.0,
                "source": req.position_source,
            },
            "reference_motion": None
            if motion is None
            else {
                "pm_ra_cosdec_mas_per_yr": motion.pm_ra_masyr,
                "pm_dec_mas_per_yr": motion.pm_dec_masyr,
                "parallax_mas": motion.parallax_mas,
                "source": req.motion_source or "unknown",
            },
        },
        "criteria": {
            "reference": crit.reference,
            "min_snr_per_exposure": _thr(crit.min_snr_per_exposure),
            "min_significance_sigma_two_sided": _thr(crit.min_significance_sigma_two_sided),
            "q_threshold_2dof": crit.q_threshold_2dof,
            "p_threshold": crit.p_threshold,
            "sigma_wcs_arcsec_per_axis": _thr(crit.sigma_wcs_arcsec_per_axis),
            "flag_radius_px": _thr(crit.flag_radius_px),
            "comparison_mask": COMPARE_MASK,
        },
        "inputs": [
            {
                "observation_id": r.observation.obs_did,
                "obs_id": r.observation.obs_id,
                "detector": r.observation.detector,
                "collection": r.observation.collection,
                "access_url": r.observation.access_url,
            }
            for r in sorted(m.measurements, key=lambda r: (r.mjd_avg, r.observation.obs_did))
        ],
        "measurements": measurements,
        "outcome": m.outcome,
        "interpretation_ceiling": "OBSERVED",
        "astrometry": astrometry,
        "photometry": None,
        "issues": issues,
        "method": {
            "name": METHOD_NAME,
            "version": METHOD_VERSION,
            "parameters": {
                "detector": req.detector,
                "box_half_px": 6,
                "centroid_half_window_px": 4,
                "psf_model": "circular Gaussian + constant",
                "parallax": "catalog parallax subtracted before the fit",
            },
            "software": [
                {"name": name, "version": version(name)} for name in ("astropy", "numpy", "scipy")
            ],
        },
        "provenance": {
            "code_ref": code_ref,
            "computed_by": "test_fixture" if is_synthetic else "offline_precompute",
            "executed_at": executed,
        },
    }


def _thr(t: Threshold) -> dict[str, Any]:
    value = float(t.value)
    if not math.isfinite(value):
        raise ValueError("non-finite threshold")
    return {"value": value, "source": str(t.source)}
