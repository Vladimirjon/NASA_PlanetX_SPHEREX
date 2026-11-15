"""Proper motion from N epochs with full per-epoch covariance (spec 0010 §4.3).

Model per epoch i (offsets already corrected for the KNOWN parallax):
    o_i = p0 + μ · (t_i - t̄)
Generalized least squares with W_i = C_i⁻¹. Epochs are assumed independent
(covariance_assumption = independent_epochs). If χ²/dof > 1 the parameter covariance is
scaled up (never down). The significance test is applied to the μ vector, not to the χ² of
the residuals (Sebastián, 2nd message).
"""

import math
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from skyshift.domain.measurement.astrometry import Cov2

F64 = npt.NDArray[np.float64]


class MotionFitError(ValueError):
    """Raised when the motion is not identifiable (fewer than 2 epochs, singular system)."""


@dataclass(frozen=True, slots=True)
class EpochOffset:
    t_jyear: float
    xi_arcsec: float  # RA·cosδ offset from the reference point
    eta_arcsec: float
    cov: Cov2


@dataclass(frozen=True, slots=True)
class MotionFit:
    pm_xi_arcsec_yr: float
    pm_eta_arcsec_yr: float
    cov_pm: Cov2
    t_mean_jyear: float
    time_span_yr: float
    chi2: float
    dof: int
    scaled: bool  # covariance multiplied by χ²/dof > 1
    residual_rms_arcsec: float | None


def fit_proper_motion(epochs: list[EpochOffset]) -> MotionFit:
    if len(epochs) < 2:
        raise MotionFitError("need at least 2 epochs")
    times = np.array([e.t_jyear for e in epochs], dtype=np.float64)
    span = float(times.max() - times.min())
    if span <= 0:
        raise MotionFitError("epochs must span a positive time")
    t_mean = float(times.mean())

    normal = np.zeros((4, 4))
    rhs = np.zeros(4)
    designs: list[F64] = []
    weights: list[F64] = []
    obs: list[F64] = []
    for e, t in zip(epochs, times, strict=True):
        dt = float(t) - t_mean
        a = np.array([[1.0, 0.0, dt, 0.0], [0.0, 1.0, 0.0, dt]])
        w = np.linalg.inv(np.array(e.cov, dtype=np.float64))
        o = np.array([e.xi_arcsec, e.eta_arcsec])
        normal += a.T @ w @ a
        rhs += a.T @ w @ o
        designs.append(a)
        weights.append(w)
        obs.append(o)
    try:
        cov_theta = np.linalg.inv(normal)
    except np.linalg.LinAlgError as exc:
        raise MotionFitError("singular normal matrix") from exc
    theta = cov_theta @ rhs

    chi2 = 0.0
    sq: list[float] = []
    for a, w, o in zip(designs, weights, obs, strict=True):
        r = o - a @ theta
        chi2 += float(r @ w @ r)
        sq.append(float(r @ r))
    dof = 2 * len(epochs) - 4
    scaled = dof > 0 and chi2 / dof > 1.0
    if scaled:
        cov_theta = cov_theta * (chi2 / dof)
    c = cov_theta[2:, 2:]
    return MotionFit(
        pm_xi_arcsec_yr=float(theta[2]),
        pm_eta_arcsec_yr=float(theta[3]),
        cov_pm=((float(c[0, 0]), float(c[0, 1])), (float(c[1, 0]), float(c[1, 1]))),
        t_mean_jyear=t_mean,
        time_span_yr=span,
        chi2=chi2,
        dof=dof,
        scaled=scaled,
        residual_rms_arcsec=math.sqrt(sum(sq) / len(sq)) if dof > 0 else None,
    )
