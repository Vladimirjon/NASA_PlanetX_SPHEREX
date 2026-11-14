"""Use case: name -> position (+ motion). Challenge targets first (offline), then Sesame."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from skyshift.application.tiered_cache import CacheLayer, TieredResolver
from skyshift.domain.targets import find_known
from skyshift.ports.origin import OriginNotFound
from skyshift.ports.resolver import NameResolver, ResolvedTarget

NAME_TTL = timedelta(days=30)
CURATED_SOURCE_URL = "https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/blob/main/docs/context/12-mapa-de-datos-spherex.md"


@dataclass(frozen=True, slots=True)
class Resolution:
    target: ResolvedTarget
    source_url: str
    retrieved_at: datetime | None
    cache_layer: CacheLayer


@dataclass(frozen=True, slots=True)
class ResolveName:
    resolver: TieredResolver
    names: NameResolver

    def _validate(self, data: bytes) -> None:
        self.names.parse(data)

    async def __call__(self, name: str) -> Resolution:
        known = find_known(name)
        if known is not None:
            return Resolution(
                ResolvedTarget(
                    known.canonical_name,
                    known.position,
                    known.motion,
                    known.epoch_label,
                    known.source,
                ),
                CURATED_SOURCE_URL,
                None,
                CacheLayer.PRECOMPUTED,
            )
        resolved = await self.resolver.get(
            self.names.cache_key(name),
            lambda: self.names.fetch(name),
            ttl=NAME_TTL,
            validate=self._validate,
        )
        target = self.names.parse(resolved.data)
        if target is None:
            raise OriginNotFound(f"no object named {name!r} in Sesame")
        return Resolution(
            target, resolved.meta.source_url, resolved.meta.retrieved_at, resolved.layer
        )
