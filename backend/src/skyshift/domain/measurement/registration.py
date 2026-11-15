"""Field-star controls for a motion measurement (Sebastián, spec 0034 §1; spec 0010 C3, C6).

- Registration: measure catalog reference stars in every exposure with the SAME method as the
  target; the per-exposure mean offset (measured - catalog) estimates that image's WCS error.
  Its scatter across exposures is compared with the provisional 0.3 arcsec per axis.
- Neighbors: catalog sources close enough to blend with the target (centroid bias).
- Wavelength dependence: slope of the target's position residuals against the local
  wavelength (an unresolved Ba/Bb pair can move its photocenter with colour).
Selection numbers here are METHOD parameters (recorded in the result), not science thresholds.
"""

import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import numpy as np

from skyshift.domain.measurement.astrometry import tangent_offset_arcsec
from skyshift.domain.motion import Motion, propagate
from skyshift.domain.position import SkyPosition

SPHEREX_PIXEL_ARCSEC = 6.15


@dataclass(frozen=True, slots=True)
class CatalogStar:
    source_id: str
    ra_deg: float
    dec_deg: float
    epoch_jyear: float
    pm_ra_masyr: float | None  # mu_alpha* = mu_alpha cos(dec)
    pm_dec_masyr: float | None
    parallax_mas: float | None
    g_mag: float | None
    ruwe: float | None

    @property
    def position(self) -> SkyPosition:
        return SkyPosition(self.ra_deg % 360.0, self.dec_deg)

    @property
    def motion(self) -> Motion | None:
        if self.pm_ra_masyr is None or self.pm_dec_masyr is None:
            return None
        return Motion(
            self.pm_ra_masyr,
            self.pm_dec_masyr,
            max(self.parallax_mas or 0.0, 0.0),
            self.epoch_jyear,
        )

    def at(self, mjd: float) -> SkyPosition:
        return propagate(self.position, self.motion, mjd=mjd)


def separation_arcsec(a: SkyPosition, b: SkyPosition) -> float:
    xi, eta = tangent_offset_arcsec(a.ra_deg, a.dec_deg, b.ra_deg, b.dec_deg)
    return math.hypot(xi, eta)


def identify_target(
    stars: Iterable[CatalogStar], position: SkyPosition, max_sep_arcsec: float = 1.0
) -> CatalogStar | None:
    """The catalog entry of the target itself (same epoch as `position`), if any."""
    best: tuple[float, CatalogStar] | None = None
    for star in stars:
        sep = separation_arcsec(star.position, position)
        if sep <= max_sep_arcsec and (best is None or sep < best[0]):
            best = (sep, star)
    return best[1] if best else None


@dataclass(frozen=True, slots=True)
class ReferenceSelection:
    g_min: float
    g_max: float
    max_ruwe: float
    min_target_sep_arcsec: float
    isolation_arcsec: float
    isolation_delta_g: float
    max_count: int


def select_references(
    stars: Sequence[CatalogStar],
    target: CatalogStar | None,
    at_mjd: float,
    rule: ReferenceSelection,
) -> list[CatalogStar]:
    """Bright-enough, well-measured, isolated catalog stars away from the target."""
    target_at = target.at(at_mjd) if target else None
    chosen: list[CatalogStar] = []
    for star in sorted(stars, key=lambda s: s.g_mag if s.g_mag is not None else math.inf):
        if target and star.source_id == target.source_id:
            continue
        if star.motion is None or star.parallax_mas is None or star.g_mag is None:
            continue
        if not rule.g_min <= star.g_mag <= rule.g_max:
            continue
        if star.ruwe is None or star.ruwe > rule.max_ruwe:
            continue
        here = star.at(at_mjd)
        if target_at and separation_arcsec(here, target_at) < rule.min_target_sep_arcsec:
            continue
        crowded = any(
            other.source_id != star.source_id
            and (other.g_mag is None or other.g_mag < star.g_mag + rule.isolation_delta_g)
            and separation_arcsec(other.at(at_mjd), here) < rule.isolation_arcsec
            for other in stars
        )
        if crowded:
            continue
        chosen.append(star)
        if len(chosen) >= rule.max_count:
            break
    return chosen


@dataclass(frozen=True, slots=True)
class Neighbor:
    source_id: str
    g_mag: float | None
    min_separation_arcsec: float


def neighbors(
    stars: Sequence[CatalogStar],
    target: CatalogStar | None,
    target_positions: Sequence[SkyPosition],
    mjds: Sequence[float],
    radius_arcsec: float,
) -> list[Neighbor]:
    """Catalog sources within `radius_arcsec` of the target at any of the given epochs."""
    found: list[Neighbor] = []
    for star in stars:
        if target and star.source_id == target.source_id:
            continue
        seps = [
            separation_arcsec(star.at(mjd), pos)
            for mjd, pos in zip(mjds, target_positions, strict=True)
        ]
        closest = min(seps) if seps else math.inf
        if closest <= radius_arcsec:
            found.append(Neighbor(star.source_id, star.g_mag, closest))
    return sorted(found, key=lambda n: n.min_separation_arcsec)


@dataclass(frozen=True, slots=True)
class RegistrationStats:
    n_exposures: int
    n_reference_measurements: int
    n_reference_stars: int
    bias_xi_arcsec: float  # mean over exposures of the per-exposure mean offset
    bias_eta_arcsec: float
    rms_xi_arcsec: float  # scatter of per-exposure mean offsets (WCS error estimate)
    rms_eta_arcsec: float
    correlation: float
    star_rms_xi_arcsec: float  # scatter of all individual reference residuals
    star_rms_eta_arcsec: float


def registration_stats(
    per_exposure: dict[str, list[tuple[str, float, float]]], min_stars_per_exposure: int = 2
) -> RegistrationStats | None:
    """Summarise reference-star residuals (arcsec). None if fewer than 2 usable exposures."""
    means: list[tuple[float, float]] = []
    all_res: list[tuple[float, float]] = []
    stars: set[str] = set()
    for residuals in per_exposure.values():
        if len(residuals) < min_stars_per_exposure:
            continue
        arr = np.array([(dx, dy) for _, dx, dy in residuals], dtype=np.float64)
        means.append((float(arr[:, 0].mean()), float(arr[:, 1].mean())))
        all_res.extend((float(a), float(b)) for a, b in arr)
        stars.update(sid for sid, _, _ in residuals)
    if len(means) < 2:
        return None
    m = np.array(means)
    r = np.array(all_res)
    sx, sy = float(m[:, 0].std(ddof=1)), float(m[:, 1].std(ddof=1))
    corr = float(np.corrcoef(m[:, 0], m[:, 1])[0, 1]) if sx > 0 and sy > 0 else 0.0
    return RegistrationStats(
        n_exposures=len(means),
        n_reference_measurements=len(all_res),
        n_reference_stars=len(stars),
        bias_xi_arcsec=float(m[:, 0].mean()),
        bias_eta_arcsec=float(m[:, 1].mean()),
        rms_xi_arcsec=sx,
        rms_eta_arcsec=sy,
        correlation=corr if math.isfinite(corr) else 0.0,
        star_rms_xi_arcsec=float(r[:, 0].std(ddof=1)),
        star_rms_eta_arcsec=float(r[:, 1].std(ddof=1)),
    )


@dataclass(frozen=True, slots=True)
class WavelengthSlope:
    n: int
    wavelength_min_um: float
    wavelength_max_um: float
    slope_xi_arcsec_per_um: float
    sigma_slope_xi: float
    slope_eta_arcsec_per_um: float
    sigma_slope_eta: float


def wavelength_slope(
    wavelengths_um: Sequence[float],
    residuals: Sequence[tuple[float, float]],
    sigmas: Sequence[tuple[float, float]],
) -> WavelengthSlope | None:
    """Weighted straight line residual = a + b·(λ - λ̄), per axis. None if not identifiable."""
    lam = np.array(wavelengths_um, dtype=np.float64)
    if lam.size < 3 or float(lam.max() - lam.min()) <= 0:
        return None
    res = np.array(residuals, dtype=np.float64)
    sig = np.array(sigmas, dtype=np.float64)
    out: list[tuple[float, float]] = []
    for axis in (0, 1):
        w = 1.0 / sig[:, axis] ** 2
        x = lam - float(np.average(lam, weights=w))
        a = np.vstack([np.ones_like(x), x]).T
        normal = a.T @ (a * w[:, None])
        cov = np.linalg.inv(normal)
        beta = cov @ (a.T @ (w * res[:, axis]))
        chi2 = float(np.sum(w * (res[:, axis] - a @ beta) ** 2))
        dof = lam.size - 2
        scale = max(1.0, chi2 / dof) if dof > 0 else 1.0
        out.append((float(beta[1]), math.sqrt(float(cov[1, 1]) * scale)))
    return WavelengthSlope(
        n=int(lam.size),
        wavelength_min_um=float(lam.min()),
        wavelength_max_um=float(lam.max()),
        slope_xi_arcsec_per_um=out[0][0],
        sigma_slope_xi=out[0][1],
        slope_eta_arcsec_per_um=out[1][0],
        sigma_slope_eta=out[1][1],
    )
