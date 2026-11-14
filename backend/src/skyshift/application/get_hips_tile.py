"""Use case: get one HiPS tile, local-first (ADR 0040). Knows only ports, never HTTP or disk."""

from dataclasses import dataclass

from skyshift.application.tiered_cache import Resolved, TieredResolver
from skyshift.domain.hips import HipsTileAddress
from skyshift.ports.tiles import TileSource


@dataclass(frozen=True, slots=True)
class GetHipsTile:
    resolver: TieredResolver
    tiles: TileSource

    async def __call__(self, address: HipsTileAddress) -> Resolved:
        return await self.resolver.get(
            address.cache_key,
            lambda: self.tiles.fetch(address),
            validate=self.tiles.validate,
        )
