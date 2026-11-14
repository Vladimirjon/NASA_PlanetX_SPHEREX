"""Observation catalog port: who lists the images covering a sky position (IRSA SIA2 today)."""

from typing import Protocol

from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import Fetched


class ObservationCatalog(Protocol):
    @property
    def collections(self) -> tuple[str, ...]: ...

    def cache_key(self, position: SkyPosition, collection: str) -> str: ...

    async def fetch(self, position: SkyPosition, collection: str) -> Fetched: ...

    def parse(self, data: bytes) -> list[Observation]:
        """Raise InvalidPayload if `data` is not a valid catalog response."""
        ...
