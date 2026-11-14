"""Tile source port: any HiPS provider (IRSA today, a mirror or another survey tomorrow)."""

from typing import Protocol

from skyshift.domain.hips import HipsTileAddress
from skyshift.ports.origin import Fetched


class TileSource(Protocol):
    async def fetch(self, address: HipsTileAddress) -> Fetched: ...

    def validate(self, data: bytes) -> None:
        """Raise InvalidPayload if `data` is not an acceptable tile."""
        ...
