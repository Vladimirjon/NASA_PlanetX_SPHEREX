# pyright: basic
# Reason: astropy / reproject ship no type stubs; signatures below are plain numpy.
"""Common-grid imaging for epoch comparison (D12 §6.7-6.12).

Grid: TAN, north up, east LEFT (astronomical convention), 6.15″/px, odd size, centred on the
target. Visual reprojection is bilinear (surface brightness MJy/sr is per steradian, so no
flux rescaling); masks are EXPANDED (any masked input pixel touching an output pixel masks it).
Background: IMAGE - ZODI, then a sigma-clipped median of valid pixels. Flux is never rescaled
between epochs (that would erase real variability).
"""

import math
import warnings
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from astropy.stats import sigma_clipped_stats
from astropy.wcs import WCS, FITSFixedWarning
from reproject import reproject_interp

PIXEL_SCALE_ARCSEC = 6.15  # D12 §2.1: OMEGA_MEDIAN → 6.153″
F32 = npt.NDArray[np.float32]
F64 = npt.NDArray[np.float64]
Bool = npt.NDArray[np.bool_]


@dataclass(frozen=True, slots=True)
class GridSpec:
    size: int  # odd, square
    ra_deg: float
    dec_deg: float
    pixel_scale_arcsec: float = PIXEL_SCALE_ARCSEC


def grid_for(ra_deg: float, dec_deg: float, fov_arcmin: float) -> GridSpec:
    size = math.ceil(fov_arcmin * 60 / PIXEL_SCALE_ARCSEC)
    size += 1 - size % 2
    return GridSpec(size=max(size, 31), ra_deg=ra_deg, dec_deg=dec_deg)


def grid_wcs(spec: GridSpec) -> WCS:
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.crval = [spec.ra_deg, spec.dec_deg]
    w.wcs.crpix = [(spec.size + 1) / 2, (spec.size + 1) / 2]
    scale = spec.pixel_scale_arcsec / 3600
    w.wcs.cdelt = [-scale, scale]  # east left, north up
    return w


def box_wcs(full: WCS, x0: int, y0: int, width: int, height: int) -> WCS:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FITSFixedWarning)
        return full[y0 : y0 + height, x0 : x0 + width]


def reproject(data: F32 | F64, source: WCS, spec: GridSpec) -> F32:
    out, _ = reproject_interp(
        (np.asarray(data, dtype=np.float64), source),
        grid_wcs(spec),
        shape_out=(spec.size, spec.size),
        order="bilinear",
    )
    return np.asarray(out, dtype=np.float32)


def reproject_mask(mask: Bool, source: WCS, spec: GridSpec) -> Bool:
    weight = reproject(mask.astype(np.float32), source, spec)
    return np.asarray(~np.isfinite(weight) | (weight > 0), dtype=np.bool_)


def subtract_background(image: F32, zodi: F32, valid: Bool) -> tuple[F32, float]:
    sky = image - zodi
    finite = valid & np.isfinite(sky)
    if finite.sum() < 10:
        return sky.astype(np.float32), float("nan")
    _, median, _ = sigma_clipped_stats(sky[finite], sigma=3.0)
    return (sky - median).astype(np.float32), float(median)


def union_percentiles(frames: list[F32]) -> tuple[float, float, float]:
    values = np.concatenate([f[np.isfinite(f)] for f in frames]) if frames else np.array([])
    if values.size == 0:
        return float("nan"), float("nan"), float("nan")
    p01, p50, p99 = np.percentile(values, [1, 50, 99])
    return float(p01), float(p50), float(p99)


def flags_clear_near(masked: Bool, center: tuple[float, float], radius_px: float = 2.5) -> bool:
    """D12 §6.13(f): no masked bit within 2.5 px of the target (IRSA CONTAINS_BAD_PIXEL radius)."""
    yy, xx = np.mgrid[0 : masked.shape[0], 0 : masked.shape[1]]
    near = (xx - center[0]) ** 2 + (yy - center[1]) ** 2 <= radius_px**2
    return not bool(masked[near].any())


def grid_wcs_world_to_pixel(spec: GridSpec, ra_deg: float, dec_deg: float) -> tuple[float, float]:
    x, y = grid_wcs(spec).wcs_world2pix(ra_deg, dec_deg, 0)
    return float(x), float(y)
