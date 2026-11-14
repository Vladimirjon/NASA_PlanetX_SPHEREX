"""Sky positions in ICRS degrees, validated at construction."""

import math
from dataclasses import dataclass


class InvalidPosition(ValueError):
    """Raised when a coordinate is outside RA [0, 360) / Dec [-90, 90] or not finite."""


@dataclass(frozen=True, slots=True)
class SkyPosition:
    ra_deg: float
    dec_deg: float

    def __post_init__(self) -> None:
        if not (math.isfinite(self.ra_deg) and math.isfinite(self.dec_deg)):
            raise InvalidPosition("coordinates must be finite numbers")
        if not 0.0 <= self.ra_deg < 360.0:
            raise InvalidPosition(f"ra must be in [0, 360), got {self.ra_deg}")
        if not -90.0 <= self.dec_deg <= 90.0:
            raise InvalidPosition(f"dec must be in [-90, 90], got {self.dec_deg}")
