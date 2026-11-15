"""Controls requested by Sebastián for the eps Ind B pair (spec 0036), offline report.

1. FLAGS around the EXPECTED and the MEASURED position and inside the real fit window.
2. Reference-star residuals for images A and B (each star, rejected matches with reason),
   leave-one-star-out, differential registration, and how Q changes if the WCS errors of
   the two dates are NOT independent (rho sweep, plus within/between-visit correlation
   estimated from all exposures).
3. Injection-recovery on REAL backgrounds with SYNTHETIC, labelled sources (pixel-integrated
   elliptical Gaussians, several SNR / FWHM / sub-pixel phases) + false positives.
4. Ba/Bb: CWAVE/CBAND at the native pixel (linked calibration) and a bias bound from the
   measured wavelength slope.
Nothing here changes the AnalysisResult or its traffic-light ceiling (OBSERVED).
"""

import math
from collections import defaultdict
from itertools import combinations
from typing import Any

import numpy as np

from skyshift.adapters.s3_spectral_wcs import CalibrationUnresolved, S3SpectralWcs
from skyshift.application.frame_reader import Box, FrameReader
from skyshift.application.measure_target import (
    BOX_HALF_PX,
    FLAG_NAMES,
    ExposureMeasurement,
    MotionMeasurement,
    flag_names,
    pair_displacement,
)
from skyshift.domain.fits_bytes import detector_pixel, image_meta, spatial_wcs
from skyshift.domain.flags import COMPARE_MASK, OUTLIER_BIT, SOURCE_BIT, comparison_mask
from skyshift.domain.imaging import flags_clear_near
from skyshift.domain.measurement.astrometry import fit_centroid, pixel_to_sky, tangent_offset_arcsec
from skyshift.domain.measurement.injection import gaussian_stamp, recovery_stats
from skyshift.domain.motion import propagate
from skyshift.domain.significance import astrometric_p_value

FIT_HALF = 4  # same window as fit_centroid's default
PIXEL_ARCSEC = 6.15
SEED = 20261114


def _q(
    delta: tuple[float, float], cov: tuple[tuple[float, float], tuple[float, float]]
) -> float | None:
    t = astrometric_p_value(delta, cov)
    return None if t is None else t.statistic


def _pixels_with_flags(
    box: Box, cx: float, cy: float, radius: float | None
) -> list[dict[str, Any]]:
    """Every pixel with a non-SOURCE flag inside a radius (or the fit window if None)."""
    out: list[dict[str, Any]] = []
    gx, gy = round(cx), round(cy)
    for y in range(box.flags.shape[0]):
        for x in range(box.flags.shape[1]):
            if radius is None:
                inside = abs(x - gx) <= FIT_HALF and abs(y - gy) <= FIT_HALF
            else:
                inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius**2
            bits = int(box.flags[y, x]) & 0xFFFFFFFF
            other = bits & ~(1 << SOURCE_BIT)
            if inside and other:
                out.append(
                    {
                        "x_pix": box.x0 + x,
                        "y_pix": box.y0 + y,
                        "flags": flag_names(bits),
                        "in_compare_mask": bool(bits & COMPARE_MASK),
                    }
                )
    return out


async def _image_controls(
    m: MotionMeasurement, frames: FrameReader, spectral: S3SpectralWcs, row: ExposureMeasurement
) -> tuple[dict[str, Any], list[tuple[float, float]], tuple[float, float]]:
    req, obs = m.request, row.observation
    chain = await frames.chain(obs)
    meta = image_meta(chain.image_header)
    expected = propagate(req.position, req.motion, mjd=meta.mjd_avg)
    xe, ye = detector_pixel(chain.image_header, expected.ra_deg, expected.dec_deg)
    bx, by = round(xe) - BOX_HALF_PX, round(ye) - BOX_HALF_PX
    box = await frames.read_box(obs, chain, bx, by, 2 * BOX_HALF_PX + 1)
    assert row.x_pix is not None
    assert row.y_pix is not None
    radius = req.criteria.flag_radius_px.value
    measured_local = (row.x_pix - bx, row.y_pix - by)
    flags = {
        "expected_position_pix": [xe, ye],
        "measured_position_pix": [row.x_pix, row.y_pix],
        "offset_measured_minus_expected_pix": [row.x_pix - xe, row.y_pix - ye],
        "radius_px": radius,
        "flagged_pixels_near_expected": _pixels_with_flags(box, xe - bx, ye - by, radius),
        "flagged_pixels_near_measured": _pixels_with_flags(box, *measured_local, radius),
        "flagged_pixels_in_fit_window": _pixels_with_flags(box, xe - bx, ye - by, None),
        "fit_window_px": [
            round(xe) - FIT_HALF,
            round(xe) + FIT_HALF,
            round(ye) - FIT_HALF,
            round(ye) + FIT_HALF,
        ],
        "note": "SOURCE (bit 21) is never a problem and is not listed; other bits are.",
    }

    # Reference stars, every attempt with its fate.
    masked, _ = comparison_mask(box.flags)
    wcs = spatial_wcs(chain.image_header)
    id_radius = req.field.identification_radius_arcsec if req.field else 0.0
    refs: list[dict[str, Any]] = []
    used: list[tuple[float, float]] = []
    for star in m.field.references if m.field else ():
        at = star.at(meta.mjd_avg)
        sx, sy = detector_pixel(chain.image_header, at.ra_deg, at.dec_deg)
        cx, cy = sx - bx, sy - by
        rec: dict[str, Any] = {
            "source_id": star.source_id,
            "g_mag": star.g_mag,
            "x_pix": sx,
            "y_pix": sy,
        }
        if not (5 <= cx <= 2 * BOX_HALF_PX - 5 and 5 <= cy <= 2 * BOX_HALF_PX - 5):
            refs.append({**rec, "status": "outside_box"})
            continue
        if not flags_clear_near(masked, (cx, cy), radius):
            refs.append({**rec, "status": "flagged"})
            continue
        fit = fit_centroid(box.image, box.variance, ~masked, (cx, cy))
        if fit is None:
            refs.append({**rec, "status": "fit_failed"})
            continue
        r_ra, r_dec, _ = pixel_to_sky(wcs, bx + fit.x, by + fit.y, fit.cov_px)
        dxi, deta = tangent_offset_arcsec(r_ra, r_dec, at.ra_deg, at.dec_deg)
        rec.update({"snr": fit.snr, "dxi_arcsec": dxi, "deta_arcsec": deta})
        if fit.snr < req.criteria.min_snr_per_exposure.value:
            refs.append({**rec, "status": "low_snr"})
        elif math.hypot(dxi, deta) > id_radius:
            refs.append({**rec, "status": "rejected_identification"})
        else:
            refs.append({**rec, "status": "used"})
            used.append((dxi, deta))

    arr = np.array(used) if used else np.zeros((0, 2))
    n = len(used)
    mean = (float(arr[:, 0].mean()), float(arr[:, 1].mean())) if n else (0.0, 0.0)
    std = (
        (float(arr[:, 0].std(ddof=1)), float(arr[:, 1].std(ddof=1)))
        if n > 1
        else (math.nan, math.nan)
    )
    loo: list[float] = []
    if n > 2:
        for i in range(n):
            rest = np.delete(arr, i, axis=0)
            loo.append(
                math.hypot(float(rest[:, 0].mean()) - mean[0], float(rest[:, 1].mean()) - mean[1])
            )
    registration: dict[str, Any] = {
        "n_used": n,
        "n_attempted": len(refs),
        "mean_offset_arcsec": list(mean),
        "std_arcsec": list(std),
        "sem_arcsec": [s / math.sqrt(n) if n > 1 else math.nan for s in std],
        "max_leave_one_star_out_shift_arcsec": max(loo) if loo else None,
        "stars": refs,
    }

    try:
        wave = await frames.wave_table(obs)
        sp = await spectral.pixel(
            obs.collection, obs.detector, round(row.x_pix), round(row.y_pix), wave
        )
        spectral_doc: dict[str, Any] = {
            "cwave_um": sp.cwave_um,
            "cband_um": sp.cband_um,
            "pixel": [round(row.x_pix), round(row.y_pix)],
            "calibration_url": sp.calibration_url,
            "version": sp.version,
            "link_check": sp.link_check,
        }
    except CalibrationUnresolved as exc:
        spectral_doc = {"status": "calibration_unresolved", "detail": str(exc)}
    doc: dict[str, Any] = {
        "observation_id": obs.obs_did,
        "acquisition_id": obs.obs_id,
        "mjd_avg": meta.mjd_avg,
        "flags": flags,
        "registration": registration,
        "spectral": spectral_doc,
    }
    return doc, used, mean


def _visit_correlation(m: MotionMeasurement) -> dict[str, Any]:
    """Correlation of per-exposure mean reference offsets within and between visits."""
    means: list[tuple[str, float, float]] = []
    for r in m.measurements:
        if r.used and len(r.ref_residuals) >= 2:
            a = np.array([(dx, dy) for _, dx, dy in r.ref_residuals])
            means.append((r.visit_id, float(a[:, 0].mean()), float(a[:, 1].mean())))
    if len(means) < 4:
        return {"status": "insufficient"}
    v = np.array([(x, y) for _, x, y in means])
    d = v - v.mean(axis=0)
    var = d.var(axis=0, ddof=1)
    acc: dict[str, list[list[float]]] = {"within": [[], []], "between": [[], []]}
    for i, j in combinations(range(len(means)), 2):
        key = "within" if means[i][0] == means[j][0] else "between"
        for ax in (0, 1):
            acc[key][ax].append(float(d[i, ax] * d[j, ax]))
    out: dict[str, Any] = {"n_exposures": len(means)}
    for key, (px, py) in acc.items():
        out[f"{key}_visit_correlation"] = [
            float(np.mean(px) / var[0]) if px else None,
            float(np.mean(py) / var[1]) if py else None,
        ]
        out[f"{key}_visit_pairs"] = len(px)
    out["note"] = (
        "rho = <d_i d_j> / var over exposure pairs; d = per-exposure mean offset minus overall mean"
    )
    return out


async def _injection(
    m: MotionMeasurement, frames: FrameReader, per_exposure: int = 6
) -> dict[str, Any]:
    """SYNTHETIC sources injected on REAL empty background of every used exposure."""
    rng = np.random.default_rng(SEED)
    req = m.request
    snr_levels = (10.0, 30.0, 100.0)
    shapes = ((1.0, 1.0), (1.15, 1.15), (1.3, 1.3), (1.2, 1.0))  # (fwhm_x, fwhm_y) px
    errors: dict[float, list[tuple[float, float]]] = defaultdict(list)
    sigmas: dict[float, list[tuple[float, float]]] = defaultdict(list)
    attempts: dict[float, int] = defaultdict(int)
    false_pos = 0
    empty_tested = 0
    stars = m.field.stars if m.field else ()
    for row in [r for r in m.measurements if r.used]:
        obs = row.observation
        chain = await frames.chain(obs)
        meta = image_meta(chain.image_header)
        expected = propagate(req.position, req.motion, mjd=meta.mjd_avg)
        xe, ye = detector_pixel(chain.image_header, expected.ra_deg, expected.dec_deg)
        bx, by = round(xe) - BOX_HALF_PX, round(ye) - BOX_HALF_PX
        box = await frames.read_box(obs, chain, bx, by, 2 * BOX_HALF_PX + 1)
        masked, _ = comparison_mask(box.flags)
        star_local: list[tuple[float, float]] = []
        for s in stars:
            pos = s.at(meta.mjd_avg)
            sx, sy = detector_pixel(chain.image_header, pos.ra_deg, pos.dec_deg)
            star_local.append((sx - bx, sy - by))
        placed = 0
        for _ in range(200):
            if placed >= per_exposure:
                break
            u, v = rng.uniform(10, 2 * BOX_HALF_PX - 10, size=2)
            gu, gv = round(u), round(v)
            win = (slice(gv - 4, gv + 5), slice(gu - 4, gu + 5))  # the fit window
            core = (slice(gv - 2, gv + 3), slice(gu - 2, gu + 3))
            if bool(masked[win].any()):
                continue
            # SOURCE covers ~95% of this field, so it cannot be avoided; instead reject cores
            # with a > 3 sigma peak over the window median (a real, visible source).
            noise = math.sqrt(float(np.nanmedian(box.variance[win])))
            if float(np.nanmax(box.image[core]) - np.nanmedian(box.image[win])) > 3 * noise:
                continue
            if any(math.hypot(u - sx, v - sy) < 3 for sx, sy in star_local):
                continue
            if math.hypot(u - (xe - bx), v - (ye - by)) < 6:
                continue
            if not np.isfinite(box.image[win]).all() or not np.isfinite(box.variance[win]).all():
                continue
            placed += 1
            empty_tested += 1
            fp = fit_centroid(box.image, box.variance, ~masked, (u, v))
            if fp is not None and fp.snr >= req.criteria.min_snr_per_exposure.value:
                false_pos += 1
            for snr in snr_levels:
                fx, fy = shapes[int(rng.integers(len(shapes)))]
                x0, y0 = u + rng.uniform(-0.5, 0.5), v + rng.uniform(-0.5, 0.5)
                unit = gaussian_stamp(box.image.shape, x0, y0, 1.0, fx, fy)
                yy, xx = np.mgrid[0 : box.image.shape[0], 0 : box.image.shape[1]]
                ap = (xx - x0) ** 2 + (yy - y0) ** 2 <= 4.0
                flux = snr * math.sqrt(float(box.variance[ap].sum())) / float(unit[ap].sum())
                img = box.image.astype(np.float64) + flux * unit
                guess = (x0 + rng.uniform(-0.5, 0.5), y0 + rng.uniform(-0.5, 0.5))
                attempts[snr] += 1
                fit = fit_centroid(img, box.variance, ~masked, guess)
                if fit is None or fit.snr < req.criteria.min_snr_per_exposure.value:
                    continue
                errors[snr].append((fit.x - x0, fit.y - y0))
                sigmas[snr].append((math.sqrt(fit.cov_px[0][0]), math.sqrt(fit.cov_px[1][1])))
    by_snr: dict[str, Any] = {}
    for snr in snr_levels:
        st = recovery_stats(errors[snr], sigmas[snr], attempts[snr])
        by_snr[f"snr_{int(snr)}"] = (
            None
            if st is None
            else {
                "n_injected": st.n_injected,
                "n_recovered": st.n_recovered,
                "bias_px": [st.bias_x_px, st.bias_y_px],
                "bias_arcsec_approx": [st.bias_x_px * PIXEL_ARCSEC, st.bias_y_px * PIXEL_ARCSEC],
                "std_px": [st.std_x_px, st.std_y_px],
                "std_arcsec_approx": [st.std_x_px * PIXEL_ARCSEC, st.std_y_px * PIXEL_ARCSEC],
                "pull_std": [st.pull_std_x, st.pull_std_y],
                "coverage_1sigma": st.coverage_1sigma,
                "coverage_2sigma": st.coverage_2sigma,
                "robust_sigma_px": [st.robust_sigma_x_px, st.robust_sigma_y_px],
                "robust_sigma_arcsec_approx": [
                    st.robust_sigma_x_px * PIXEL_ARCSEC,
                    st.robust_sigma_y_px * PIXEL_ARCSEC,
                ],
                "robust_pull": [st.robust_pull_x, st.robust_pull_y],
                "catastrophic_fraction": st.catastrophic_fraction,
                "core_coverage_2sigma_both_axes": st.core_coverage_2sigma,
            }
        )
    return {
        "label": "SYNTHETIC injected sources on REAL SPHEREx backgrounds; not detections",
        "seed": SEED,
        "exposures": sum(1 for r in m.measurements if r.used),
        "positions_per_exposure": per_exposure,
        "profile": "pixel-integrated Gaussian, FWHM (x,y) px in " + str(list(shapes)),
        "initial_guess_error_px": "uniform +/-0.5",
        "placement": (
            "random positions in the 81x81 px box: no COMPARE_MASK bit in the 9x9 fit "
            "window, no Gaia star within 3 px, no > 3 sigma peak in the 5x5 core. SOURCE "
            "covers ~95% of this field and is NOT avoided: faint background sources remain."
        ),
        "pixel_frame": "detector pixels (statistical centroid error only; WCS term not included)",
        "by_snr": by_snr,
        "false_positives": {
            "empty_positions_tested": empty_tested,
            "fits_with_snr_ge_threshold": false_pos,
            "rate": false_pos / empty_tested if empty_tested else None,
        },
        "ideal": {"pull_std": 1.0, "coverage_1sigma": 0.683, "coverage_2sigma": 0.954},
    }


async def pair_controls(
    m: MotionMeasurement,
    frames: FrameReader,
    spectral: S3SpectralWcs,
    acquisition_ids: tuple[str, str],
    *,
    result_ref: str,
    code_ref: str | None,
) -> dict[str, Any]:
    by_acq = {r.observation.obs_id: r for r in m.measurements}
    a, b = by_acq.get(acquisition_ids[0]), by_acq.get(acquisition_ids[1])
    if a is None or b is None or not (a.used and b.used):
        return {"error": "pair not measured or excluded", "acquisition_ids": list(acquisition_ids)}
    doc_a, _, mean_a = await _image_controls(m, frames, spectral, a)
    doc_b, _, mean_b = await _image_controls(m, frames, spectral, b)

    pair = pair_displacement(m.request, a, b)
    sig = m.applied_sigma_arcsec
    assert a.cov_stat is not None
    assert b.cov_stat is not None
    stat = [[a.cov_stat[i][j] + b.cov_stat[i][j] for j in (0, 1)] for i in (0, 1)]
    delta = (pair.delta_xi_arcsec, pair.delta_eta_arcsec)
    rho_sweep: list[dict[str, Any]] = []
    for rho in (-1.0, -0.5, 0.0, 0.5, 0.9):
        wcs = [2 * s * s * (1 - rho) for s in sig]
        cov = ((stat[0][0] + wcs[0], stat[0][1]), (stat[1][0], stat[1][1] + wcs[1]))
        rho_sweep.append(
            {
                "rho_wcs_between_dates": rho,
                "Q": _q(delta, cov),
                "sigma_delta_arcsec": [math.sqrt(cov[0][0]), math.sqrt(cov[1][1])],
            }
        )
    sem_a = doc_a["registration"]["sem_arcsec"]
    sem_b = doc_b["registration"]["sem_arcsec"]
    diff_delta = (delta[0] - (mean_b[0] - mean_a[0]), delta[1] - (mean_b[1] - mean_a[1]))
    diff_cov = (
        (stat[0][0] + sem_a[0] ** 2 + sem_b[0] ** 2, stat[0][1]),
        (stat[1][0], stat[1][1] + sem_a[1] ** 2 + sem_b[1] ** 2),
    )
    differential = {
        "description": (
            "target displacement corrected by (mean reference offset B - A); WCS term "
            "replaced by the SEM of each image's reference offsets"
        ),
        "delta_arcsec": list(diff_delta),
        "sigma_delta_arcsec": [math.sqrt(diff_cov[0][0]), math.sqrt(diff_cov[1][1])],
        "Q": _q(diff_delta, diff_cov),
    }

    lam = m.wavelength
    cw_a = doc_a["spectral"].get("cwave_um")
    cw_b = doc_b["spectral"].get("cwave_um")
    ba_bb: dict[str, Any] = {"status": "not_computable"}
    if lam is not None and cw_a is not None and cw_b is not None:
        dl = abs(cw_b - cw_a)
        bound = [(abs(lam.slope_xi_arcsec_per_um) + 2 * lam.sigma_slope_xi) * dl,
                 (abs(lam.slope_eta_arcsec_per_um) + 2 * lam.sigma_slope_eta) * dl]  # fmt: skip
        sig_pair = [math.sqrt(pair.cov[0][0]), math.sqrt(pair.cov[1][1])]
        ba_bb = {
            "delta_cwave_um": dl,
            "slope_used": (
                "multi-epoch residual slope vs WCS-WAVE "
                "(AnalysisResult.astrometry.wavelength_dependence)"
            ),
            "bias_bound_arcsec_2sigma": bound,
            "pair_sigma_arcsec": sig_pair,
            "bound_over_sigma": [bound[0] / sig_pair[0], bound[1] / sig_pair[1]],
            "series_range_bound_arcsec_2sigma": [
                (abs(lam.slope_xi_arcsec_per_um) + 2 * lam.sigma_slope_xi)
                * (lam.wavelength_max_um - lam.wavelength_min_um),
                (abs(lam.slope_eta_arcsec_per_um) + 2 * lam.sigma_slope_eta)
                * (lam.wavelength_max_um - lam.wavelength_min_um),
            ],
            "limits": "linear model in wavelength; a non-linear photocenter shift is not excluded",
        }

    return {
        "label": "Controls for spec 0036 (Sebastián). Candidate only; ceiling OBSERVED.",
        "result_ref": result_ref,
        "code_ref": code_ref,
        "pair": {"A": doc_a, "B": doc_b},
        "pair_displacement": {
            "delta_arcsec": list(delta),
            "Q_as_delivered_independent": pair.test.statistic if pair.test else None,
            "applied_sigma_wcs_arcsec": list(sig),
            "rho_sweep": rho_sweep,
            "differential_registration": differential,
            "q_threshold_2dof": m.request.criteria.q_threshold_2dof,
        },
        "visit_correlation_all_exposures": _visit_correlation(m),
        "injection_recovery": await _injection(m, frames),
        "ba_bb_bias": ba_bb,
        "flag_names": {str(k): v for k, v in sorted(FLAG_NAMES.items())},
        "outlier_bit": OUTLIER_BIT,
    }
