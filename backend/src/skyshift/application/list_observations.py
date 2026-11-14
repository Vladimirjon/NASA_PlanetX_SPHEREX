"""Use case: list the SPHEREx images covering a position, grouped into visits (D12 §5)."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from skyshift.application.tiered_cache import CacheLayer, TieredResolver
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.domain.visits import Visit, group_into_visits
from skyshift.ports.catalog import ObservationCatalog

# Quick releases are added weekly; refresh the listing daily (stale copy served if IRSA fails).
CATALOG_TTL = timedelta(hours=24)

# Worst first: if any collection came from an older/indirect layer, report that one.
_LAYER_ORDER = [CacheLayer.LOCAL, CacheLayer.PRECOMPUTED, CacheLayer.MEMORY, CacheLayer.ORIGIN]


@dataclass(frozen=True, slots=True)
class ObservationIndex:
    position: SkyPosition
    visits: tuple[Visit, ...]
    source_urls: tuple[str, ...]
    retrieved_at: datetime  # oldest of the collections: never present old data as new
    cache_layer: CacheLayer
    stale: bool


@dataclass(frozen=True, slots=True)
class ListObservations:
    resolver: TieredResolver
    catalog: ObservationCatalog

    def _validate(self, data: bytes) -> None:
        self.catalog.parse(data)  # raises InvalidPayload; never cache an error page

    async def __call__(self, position: SkyPosition) -> ObservationIndex:
        observations: dict[str, Observation] = {}
        urls: list[str] = []
        dates: list[datetime] = []
        layers: list[CacheLayer] = []
        stale = False
        for collection in self.catalog.collections:
            resolved = await self.resolver.get(
                self.catalog.cache_key(position, collection),
                lambda c=collection: self.catalog.fetch(position, c),
                ttl=CATALOG_TTL,
                validate=self._validate,
            )
            for item in self.catalog.parse(resolved.data):
                observations[item.obs_did] = item
            urls.append(resolved.meta.source_url)
            dates.append(resolved.meta.retrieved_at)
            layers.append(resolved.layer)
            stale = stale or resolved.stale
        return ObservationIndex(
            position=position,
            visits=tuple(group_into_visits(observations.values())),
            source_urls=tuple(urls),
            retrieved_at=min(dates),
            cache_layer=min(layers, key=_LAYER_ORDER.index),
            stale=stale,
        )
