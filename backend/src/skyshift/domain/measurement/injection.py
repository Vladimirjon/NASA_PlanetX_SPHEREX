"""Synthetic sources for injection-recovery tests (spec 0034 §2, spec 0036 request 3).

Everything produced here is SYNTHETIC and must be labelled as such: it is only used to
measure how wrong the centroid method is on real backgrounds, never as a detection.
The injected profile is a PIXEL-INTEGRATED elliptical Gaussian (erf over each pixel), so
it is not the exact model the fitter assumes (point-sampled circular Gaussian): the test
includes that model mismatch on purpose.
"""

import math
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

F64 = npt.NDArray[np.float64]
FWHM_TO_SIGMA = 1.0 / (2.0 * math.sqrt(2.0 * math.log(2.0)))
CATASTROPHIC_PX = 0.5  # half a pixel = 3 arcsec: the fit went to another feature


def _erf(x: F64) -> F64:
    """Vectorised error function (Abramowitz-Stegun 7.1.26, |error| < 1.5e-7)."""
    sign = np.sign(x)
    a = np.abs(x)
    t = 1.0 / (1.0 + 0.3275911 * a)
    poly = t * (
        0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))
    )
    return sign * (1.0 - poly * np.exp(-a * a))


def gaussian_stamp(
    shape: tuple[int, int],
    x0: float,
    y0: float,
    total_flux: float,
    fwhm_x: float,
    fwhm_y: float,
) -> F64:
    """Pixel-integrated axis-aligned Gaussian (pixel i spans [i-0.5, i+0.5])."""
    sx, sy = fwhm_x * FWHM_TO_SIGMA, fwhm_y * FWHM_TO_SIGMA
    xs = np.arange(shape[1], dtype=np.float64)
    ys = np.arange(shape[0], dtype=np.float64)
    fx = 0.5 * (
        _erf((xs + 0.5 - x0) / (math.sqrt(2) * sx)) - _erf((xs - 0.5 - x0) / (math.sqrt(2) * sx))
    )
    fy = 0.5 * (
        _erf((ys + 0.5 - y0) / (math.sqrt(2) * sy)) - _erf((ys - 0.5 - y0) / (math.sqrt(2) * sy))
    )
    return total_flux * np.outer(fy, fx)


@dataclass(frozen=True, slots=True)
class RecoveryStats:
    n_injected: int
    n_recovered: int
    bias_x_px: float
    bias_y_px: float
    std_x_px: float
    std_y_px: float
    pull_std_x: float  # std of (error / declared sigma); 1 means honest errors
    pull_std_y: float
    coverage_1sigma: float  # fraction with |error| <= 1 sigma, both axes pooled (~0.683 ideal)
    coverage_2sigma: float  # (~0.954 ideal)
    robust_sigma_x_px: float  # 1.4826 * MAD, insensitive to catastrophic captures
    robust_sigma_y_px: float
    robust_pull_x: float  # 1.4826 * MAD of error/sigma (1 = honest core errors)
    robust_pull_y: float
    catastrophic_fraction: float  # |error| > CATASTROPHIC_PX on either axis
    core_coverage_2sigma: float  # 2-sigma coverage among non-catastrophic recoveries


def recovery_stats(
    errors_px: list[tuple[float, float]], sigmas_px: list[tuple[float, float]], n_injected: int
) -> RecoveryStats | None:
    """Summarise recovered-minus-true offsets and their declared 1-sigma errors."""
    if len(errors_px) < 3:
        return None
    e = np.array(errors_px, dtype=np.float64)
    s = np.array(sigmas_px, dtype=np.float64)
    pull = e / s
    flat = np.abs(pull).ravel()
    bad = (np.abs(e) > CATASTROPHIC_PX).any(axis=1)
    return RecoveryStats(
        n_injected=n_injected,
        n_recovered=len(errors_px),
        bias_x_px=float(e[:, 0].mean()),
        bias_y_px=float(e[:, 1].mean()),
        std_x_px=float(e[:, 0].std(ddof=1)),
        std_y_px=float(e[:, 1].std(ddof=1)),
        pull_std_x=float(pull[:, 0].std(ddof=1)),
        pull_std_y=float(pull[:, 1].std(ddof=1)),
        coverage_1sigma=float((flat <= 1.0).mean()),
        coverage_2sigma=float((flat <= 2.0).mean()),
        robust_sigma_x_px=_mad(e[:, 0]),
        robust_sigma_y_px=_mad(e[:, 1]),
        robust_pull_x=_mad(pull[:, 0]),
        robust_pull_y=_mad(pull[:, 1]),
        catastrophic_fraction=float(bad.mean()),
        core_coverage_2sigma=float((np.abs(pull[~bad]) <= 2.0).all(axis=1).mean())
        if (~bad).any()
        else 0.0,
    )


def _mad(v: F64) -> float:
    return float(1.4826 * np.median(np.abs(v - np.median(v))))
