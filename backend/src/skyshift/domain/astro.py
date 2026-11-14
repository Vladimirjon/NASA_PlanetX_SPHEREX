# pyright: basic
# Reason: astropy ships no type stubs. This module is the ONLY place that touches astropy
# objects; it exposes plain float signatures so the rest of the code stays strict.
"""Typed boundary over astropy (anti-corruption layer)."""

from datetime import UTC, datetime

import numpy as np
from astropy import units as u
from astropy.coordinates import get_body_barycentric_posvel
from astropy.time import Time


def _tdb(mjd: float) -> Time:
    return Time(mjd, format="mjd", scale="tdb")


def julian_year(mjd: float) -> float:
    return float(np.asarray(_tdb(mjd).jyear, dtype=np.float64))


def earth_barycentric_au(mjd: float) -> tuple[float, float, float]:
    """Earth's barycentric position (ICRS axes, AU), ERFA built-in ephemeris, no downloads."""
    position, _velocity = get_body_barycentric_posvel("earth", _tdb(mjd))
    if position is None:
        raise RuntimeError("astropy returned no Earth position")
    xyz = np.asarray(u.Quantity(position.get_xyz(), u.AU).value, dtype=np.float64)
    return float(xyz[0]), float(xyz[1]), float(xyz[2])


def mjd_to_datetime(mjd: float) -> datetime:
    """UTC datetime of an MJD (SPHEREx MJD-AVG is UTC, TIMESYS='UTC')."""
    iso = str(Time(mjd, format="mjd", scale="utc").isot)
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)
