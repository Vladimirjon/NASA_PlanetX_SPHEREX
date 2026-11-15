# pyright: basic
# Reason: astropy and scipy ship no type stubs. This module is the typed boundary: it takes
# numpy arrays and returns plain dataclasses / floats (same convention as fits_bytes.py).
"""Centroid in the native detector frame and its sky covariance (spec 0010 §1, annex A2).

Measuring in each image's own pixels avoids resampling (no interpolation noise, no
correlated pixels); the image's Gaia-calibrated WCS (with SIP) turns pixels into sky.
Reprojection is for display only.
"""

import math
from dataclasses import dataclass
from typing import cast

import numpy as np
import numpy.typing as npt
from astropy.wcs import WCS
from scipy.optimize import least_squares

F64 = npt.NDArray[np.float64]
Cov2 = tuple[tuple[float, float], tuple[float, float]]
SIGMA_TO_FWHM = 2.0 * math.sqrt(2.0 * math.log(2.0))
MIN_GOOD_PIXELS = 12
APERTURE_RADIUS_PX = 2.0
ARCSEC_PER_RAD = 180.0 / math.pi * 3600.0


@dataclass(frozen=True, slots=True)
class Centroid:
    x: float  # same pixel frame as the arrays passed in (0-based)
    y: float
    cov_px: Cov2
    fwhm_px: float
    snr: float
    reduced_chi2: float


def _model(p: F64, xx: F64, yy: F64) -> F64:
    amp, x0, y0, sigma, bkg = p
    return amp * np.exp(-((xx - x0) ** 2 + (yy - y0) ** 2) / (2.0 * sigma**2)) + bkg


def fit_centroid(
    image: npt.NDArray[np.floating],
    variance: npt.NDArray[np.floating],
    usable: npt.NDArray[np.bool_],
    guess: tuple[float, float],
    half_window: int = 4,
) -> Centroid | None:
    """Weighted least-squares circular Gaussian + constant around `guess`.

    Returns None when the fit is not defined (too few good pixels, no convergence, singular
    covariance). The covariance is (JᵀWJ)⁻¹, scaled up by the reduced χ² when it exceeds 1.
    """
    gx, gy = round(guess[0]), round(guess[1])
    y0, y1 = max(0, gy - half_window), min(image.shape[0], gy + half_window + 1)
    x0, x1 = max(0, gx - half_window), min(image.shape[1], gx + half_window + 1)
    data = np.asarray(image[y0:y1, x0:x1], dtype=np.float64)
    var = np.asarray(variance[y0:y1, x0:x1], dtype=np.float64)
    good = np.asarray(usable[y0:y1, x0:x1]) & np.isfinite(data) & np.isfinite(var) & (var > 0)
    if int(good.sum()) < MIN_GOOD_PIXELS:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    d, w, xg, yg = data[good], 1.0 / np.sqrt(var[good]), xx[good], yy[good]

    bkg0 = float(np.median(d))
    peak = int(np.argmax(d))
    amp0 = max(float(d[peak]) - bkg0, 1e-12)
    start = np.array([amp0, xg[peak], yg[peak], 0.55, bkg0], dtype=np.float64)
    lower = np.array([0.0, x0 - 0.5, y0 - 0.5, 0.2, -np.inf])
    upper = np.array([np.inf, x1 - 0.5, y1 - 0.5, 3.0, np.inf])

    def residual(p: F64) -> F64:
        return (_model(p, xg, yg) - d) * w

    res = least_squares(residual, start, bounds=(lower, upper), method="trf")
    if not bool(res.success):
        return None
    p = cast(F64, res.x)
    jac = cast(F64, res.jac)
    fun = cast(F64, res.fun)
    dof = d.size - p.size
    if dof <= 0:
        return None
    reduced = float(fun @ fun) / dof
    try:
        cov = np.linalg.inv(jac.T @ jac) * max(1.0, reduced)
    except np.linalg.LinAlgError:
        return None
    cxx, cxy, cyy = float(cov[1, 1]), float(cov[1, 2]), float(cov[2, 2])
    if not all(math.isfinite(v) for v in (cxx, cxy, cyy)) or cxx <= 0 or cyy <= 0:
        return None

    near = ((xx - p[1]) ** 2 + (yy - p[2]) ** 2 <= APERTURE_RADIUS_PX**2) & good
    noise = math.sqrt(float(var[near].sum())) if near.any() else math.inf
    snr = float((data[near] - p[4]).sum()) / noise if noise > 0 else 0.0
    return Centroid(
        x=float(p[1]),
        y=float(p[2]),
        cov_px=((cxx, cxy), (cxy, cyy)),
        fwhm_px=float(p[3]) * SIGMA_TO_FWHM,
        snr=snr,
        reduced_chi2=reduced,
    )


def tangent_offset_arcsec(
    ra_deg: float, dec_deg: float, ra0_deg: float, dec0_deg: float
) -> tuple[float, float]:
    """Gnomonic (ξ, η) of (ra, dec) about (ra0, dec0), in arcsec. ξ points east (RA·cosδ)."""
    a, d = math.radians(ra_deg), math.radians(dec_deg)
    a0, d0 = math.radians(ra0_deg), math.radians(dec0_deg)
    cos_c = math.sin(d0) * math.sin(d) + math.cos(d0) * math.cos(d) * math.cos(a - a0)
    xi = math.cos(d) * math.sin(a - a0) / cos_c
    eta = (math.cos(d0) * math.sin(d) - math.sin(d0) * math.cos(d) * math.cos(a - a0)) / cos_c
    return xi * ARCSEC_PER_RAD, eta * ARCSEC_PER_RAD


def pixel_to_sky(wcs: WCS, x: float, y: float, cov_px: Cov2) -> tuple[float, float, Cov2]:
    """(ra, dec) of a 0-based detector pixel and the covariance in arcsec² (RA·cosδ, Dec).

    The Jacobian is taken numerically from the full WCS (SIP included), so pixel scale,
    rotation and distortion all propagate into the sky covariance.
    """
    step = 0.5
    pts = np.array([[x, y], [x + step, y], [x, y + step]], dtype=np.float64)
    world = cast(F64, wcs.all_pix2world(pts, 0))
    ra, dec = float(world[0, 0]), float(world[0, 1])
    jx = tangent_offset_arcsec(float(world[1, 0]), float(world[1, 1]), ra, dec)
    jy = tangent_offset_arcsec(float(world[2, 0]), float(world[2, 1]), ra, dec)
    jac = np.array([[jx[0], jy[0]], [jx[1], jy[1]]], dtype=np.float64) / step
    sky = jac @ np.array(cov_px, dtype=np.float64) @ jac.T
    cov: Cov2 = ((float(sky[0, 0]), float(sky[0, 1])), (float(sky[1, 0]), float(sky[1, 1])))
    return ra % 360.0, dec, cov


def add_isotropic(cov: Cov2, sigma_arcsec: float) -> Cov2:
    """C = C_stat + diag(sigma², sigma²): provisional per-axis WCS error (spec 0010 §4.3, A5)."""
    s2 = sigma_arcsec**2
    return ((cov[0][0] + s2, cov[0][1]), (cov[1][0], cov[1][1] + s2))
