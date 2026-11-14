"""Propagate a catalog position to an image date: proper motion + annual parallax (D12 §7).

Tangent-plane formula (valid for offsets ≪ 1°). Rigorous space motion differs by ≤0.07″ for
Barnard's Star (D12 §7), i.e. 0.01 SPHEREx pixel. Earth's barycentric position comes from
astropy's built-in ERFA ephemeris (no downloads). SPHEREx's own offset from Earth (~7000 km)
is negligible for parallax.
"""

import math
from dataclasses import dataclass

from skyshift.domain.astro import earth_barycentric_au, julian_year
from skyshift.domain.position import SkyPosition

MAS_PER_DEG = 3_600_000.0


@dataclass(frozen=True, slots=True)
class Motion:
    pm_ra_masyr: float  # mu_alpha* = mu_alpha cos(dec)
    pm_dec_masyr: float
    parallax_mas: float  # 0 if unknown
    ref_epoch_jyear: float


def propagate(position: SkyPosition, motion: Motion | None, *, mjd: float) -> SkyPosition:
    if motion is None:
        return position
    dt_years = julian_year(mjd) - motion.ref_epoch_jyear

    ra0, dec0 = math.radians(position.ra_deg), math.radians(position.dec_deg)
    x, y, z = earth_barycentric_au(mjd)
    e_ra = (-math.sin(ra0), math.cos(ra0), 0.0)
    e_dec = (-math.sin(dec0) * math.cos(ra0), -math.sin(dec0) * math.sin(ra0), math.cos(dec0))
    par_ra = motion.parallax_mas * (x * e_ra[0] + y * e_ra[1] + z * e_ra[2])
    par_dec = motion.parallax_mas * (x * e_dec[0] + y * e_dec[1] + z * e_dec[2])

    d_ra_star = motion.pm_ra_masyr * dt_years - par_ra
    d_dec = motion.pm_dec_masyr * dt_years - par_dec
    ra = position.ra_deg + d_ra_star / math.cos(dec0) / MAS_PER_DEG
    dec = position.dec_deg + d_dec / MAS_PER_DEG
    return SkyPosition(ra % 360.0, max(-90.0, min(90.0, dec)))
