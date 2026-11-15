"""Reference-star catalog port: astrometric catalog stars around a position (Gaia DR3 today)."""

from typing import Protocol

from skyshift.domain.measurement.registration import CatalogStar
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import Fetched


class ReferenceStarCatalog(Protocol):
    name: str  # e.g. "Gaia DR3 (IRSA gaia_dr3_source)"

    def cache_key(self, center: SkyPosition, radius_arcsec: float) -> str: ...

    async def fetch(self, center: SkyPosition, radius_arcsec: float) -> Fetched: ...

    def parse(self, data: bytes) -> list[CatalogStar]:
        """Raise InvalidPayload if `data` is not a valid catalog response."""
        ...
