"""Evidence for Sebastián's method checklist (science/checklists.py, spec 0034), pair format.

His `build_checklist` takes exactly two observation records plus `checks` with
status/reason/evidence_refs. This module supplies the MEASURER's evidence for the motion
method on the pair he audits. It only marks `pass` what was demonstrated by this run
(identity of files, coverage, reproducible method); everything whose acceptability is a
science decision stays `unknown` with the numbers, for him to audit. Stage stays
`preselection`: this never promotes a case.
"""

import math
from datetime import UTC, datetime, timedelta
from typing import Any

from skyshift.application.measure_target import (
    ExposureMeasurement,
    MotionMeasurement,
    pair_displacement,
)

MJD_EPOCH = datetime(1858, 11, 17, tzinfo=UTC)


def _utc(mjd: float) -> str:
    return (
        (MJD_EPOCH + timedelta(days=mjd)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )


def _record(r: ExposureMeasurement) -> dict[str, Any]:
    o = r.observation
    return {
        "product_id": o.obs_did,
        "acquisition_id": o.obs_id,
        "identity_status": "resolved",
        "midpoint_utc": _utc(r.mjd_avg),
        "wavelength_um": r.wavelength_um,
        "wavelength_method": "wcs_wave_approximation",
        "collection": o.collection,
        "detector": f"D{o.detector}",
        "source_url": o.access_url,
        "measured_ra_deg": r.ra_deg,
        "measured_dec_deg": r.dec_deg,
        "cov_pos_arcsec2": None if r.cov_pos is None else [list(r.cov_pos[0]), list(r.cov_pos[1])],
        "snr": r.snr,
        "n_reference_stars": len(r.ref_residuals),
    }


def _check(status: str, reason: str, refs: list[str]) -> dict[str, Any]:
    return {"status": status, "reason": reason, "evidence_refs": refs}


def checklist_evidence(
    m: MotionMeasurement,
    acquisition_ids: tuple[str, str],
    *,
    result_ref: str,
    code_ref: str | None,
) -> dict[str, Any]:
    by_acq = {r.observation.obs_id: r for r in m.measurements}
    found = [by_acq.get(a) for a in acquisition_ids]
    refs = [result_ref] + ([f"git:{code_ref}"] if code_ref else [])
    missing = [a for a, r in zip(acquisition_ids, found, strict=True) if r is None]
    if missing:
        return {
            "id": "epsilon",
            "stage": "preselection",
            "interpretation": "not_evaluated",
            "error": f"pair not measured in this run: {missing}",
        }
    a, b = found[0], found[1]
    assert a is not None
    assert b is not None
    both_used = a.used and b.used
    checks: dict[str, Any] = {}

    if both_used:
        pair = pair_displacement(m.request, a, b)
        sep = math.hypot(pair.delta_xi_arcsec, pair.delta_eta_arcsec)
        pair_doc: dict[str, Any] | None = {
            "delta_ra_cosdec_arcsec": pair.delta_xi_arcsec,
            "delta_dec_arcsec": pair.delta_eta_arcsec,
            "separation_arcsec": sep,
            "cov_arcsec2": [list(pair.cov[0]), list(pair.cov[1])],
            "chi2_2dof": pair.test.statistic if pair.test else None,
            "p_value": pair.test.p_value if pair.test else None,
            "covariance_assumption": "independent_epochs",
            "parallax": "catalog parallax removed before the difference",
        }
        checks["target"] = _check(
            "pass",
            "A source was centroided in both exposures at the catalog-propagated position "
            "(proper motion + parallax, Gaia DR3); SNR "
            f"{a.snr:.0f} and {b.snr:.0f}.",
            refs,
        )
        checks["coverage"] = _check(
            "pass",
            "Target at least 15 px inside the detector and no COMPARE_MASK bit within "
            "2.5 px in both exposures.",
            refs,
        )
    else:
        pair_doc = None
        reasons = [r.excluded_reason for r in (a, b) if r.excluded_reason]
        checks["target"] = _check("fail", f"Pair member excluded: {reasons}", refs)
        checks["coverage"] = _check("fail", f"Pair member excluded: {reasons}", refs)

    reg = m.registration
    checks["alignment"] = _check(
        "unknown",
        "No field-star registration in this run."
        if reg is None
        else (
            f"{reg.n_reference_stars} Gaia stars measured with the same method in "
            f"{reg.n_exposures} exposures; per-exposure offset scatter "
            f"{reg.rms_xi_arcsec:.3f} / {reg.rms_eta_arcsec:.3f} arcsec (RA*cosDec / Dec), "
            f"bias {reg.bias_xi_arcsec:+.3f} / {reg.bias_eta_arcsec:+.3f} arcsec, "
            f"correlation {reg.correlation:+.2f}. Exposure A used "
            f"{len(a.ref_residuals)} stars, B {len(b.ref_residuals)}. Acceptability is a "
            "science decision; Gaia is not independent of the SPHEREx WCS."
        ),
        refs,
    )
    near = (
        "; ".join(
            f"{n.source_id} G={n.g_mag} at {n.min_separation_arcsec:.1f} arcsec"
            for n in m.close_sources
        )
        or "none"
    )
    checks["quality"] = _check(
        "unknown",
        f"FLAGS clear near the target in both exposures: {both_used}. Catalog sources "
        f"within {m.request.field.neighbor_radius_arcsec if m.request.field else 0:.1f} "
        f"arcsec of the target at the used epochs: {near}. Their effect on the centroid is "
        "not quantified yet.",
        refs,
    )
    sx, sy = m.applied_sigma_arcsec
    checks["uncertainty"] = _check(
        "unknown",
        f"Per-exposure covariance = centroid (weighted fit, scaled by reduced chi2 >= 1) + "
        f"WCS term {sx:.3f} / {sy:.3f} arcsec per axis (max of the provisional 0.3 and the "
        "field-star scatter). Epochs treated as independent.",
        refs,
    )
    lam = m.wavelength
    checks["centroid_color_bias"] = _check(
        "unknown",
        "Not testable in this run."
        if lam is None
        else (
            f"Residual slope vs local wavelength over {lam.n} exposures "
            f"({lam.wavelength_min_um:.3f}-{lam.wavelength_max_um:.3f} um): RA*cosDec "
            f"{lam.slope_xi_arcsec_per_um:+.3f} +/- {lam.sigma_slope_xi:.3f}, Dec "
            f"{lam.slope_eta_arcsec_per_um:+.3f} +/- {lam.sigma_slope_eta:.3f} arcsec/um. "
            f"Pair wavelengths {a.wavelength_um} / {b.wavelength_um} um (WCS-WAVE)."
        ),
        refs,
    )
    checks["method"] = _check(
        "pass",
        "Reproducible: mise run measure-epsindb (backend/src/skyshift, native-frame "
        "Gaussian centroid, GLS proper motion, field registration); inputs and every "
        "exclusion listed in the referenced result.",
        refs,
    )
    return {
        "id": "epsilon",
        "name": "Epsilon Indi B",
        "focus": "Candidate · apparent motion",
        "stage": "preselection",
        "interpretation": "not_evaluated",
        "evidence_supplied_by": "Mateo (measurement)",
        "checks": checks,
        "observations": [_record(a), _record(b)],
        "pair_measurement": pair_doc,
        "multi_epoch_context": {
            "outcome": m.outcome,
            "n_visits": m.n_visits,
            "pm_ra_cosdec_arcsec_per_yr": m.fit.pm_xi_arcsec_yr if m.fit else None,
            "pm_dec_arcsec_per_yr": m.fit.pm_eta_arcsec_yr if m.fit else None,
        },
    }
