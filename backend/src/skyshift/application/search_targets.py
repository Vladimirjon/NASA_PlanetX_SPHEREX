"""Local catalog first, then the existing cached name resolver."""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from skyshift.application.resolve_name import ResolveName
from skyshift.application.tiered_cache import CacheLayer
from skyshift.domain.motion import Motion
from skyshift.domain.position import InvalidPosition
from skyshift.domain.search import Target, parse_coordinates, rank, resembles_coordinates
from skyshift.ports.origin import OriginNotFound


@dataclass(frozen=True, slots=True)
class Suggestion:
    name: str
    kind: Literal["target", "coordinates", "resolver"]
    ra: float
    dec: float
    coordinate_epoch: str | None
    motion: Motion | None
    object_type: str | None
    description: str | None
    matched_alias: str | None
    score: float
    source_url: str
    retrieved_at: datetime
    cache_layer: CacheLayer
    resolver: str | None = None
    reference: str | None = None
    astrometry_source: str | None = None


@dataclass(frozen=True, slots=True)
class SearchTargets:
    catalog: tuple[Target, ...]
    resolve: ResolveName

    async def __call__(self, query: str, limit: int) -> list[Suggestion]:
        coords = parse_coordinates(query)
        if coords is not None:
            return [
                Suggestion(
                    query,
                    "coordinates",
                    *coords,
                    "ICRS",
                    None,
                    None,
                    None,
                    None,
                    1.0,
                    "https://www.ivoa.net/documents/STC/",
                    datetime.now(UTC),
                    CacheLayer.PRECOMPUTED,
                )
            ]
        if resembles_coordinates(query):
            raise InvalidPosition("invalid or out-of-range coordinates")
        matches: list[Suggestion] = []
        for target in self.catalog:
            score, alias = rank(query, (target.name, *target.aliases))
            if score >= 0.56:
                matches.append(
                    Suggestion(
                        target.name,
                        "target",
                        target.ra,
                        target.dec,
                        target.coordinate_epoch,
                        target.motion,
                        target.object_type,
                        target.description,
                        alias,
                        score,
                        target.source_url,
                        target.retrieved_at,
                        CacheLayer.PRECOMPUTED,
                        target.resolver,
                        target.reference,
                        target.astrometry_source,
                    )
                )
        matches.sort(key=lambda item: (-item.score, item.name.casefold(), item.name))
        if not matches or matches[0].score < 0.72:
            try:
                result = await self.resolve(query)
            except OriginNotFound:
                return []
            else:
                target = result.target
                matches.insert(
                    0,
                    Suggestion(
                        target.canonical_name or query,
                        "resolver",
                        target.position.ra_deg,
                        target.position.dec_deg,
                        target.epoch_label,
                        target.motion,
                        None,
                        None,
                        None,
                        0.72,
                        result.source_url,
                        result.retrieved_at or datetime.now(UTC),
                        result.cache_layer,
                        target.source,
                    ),
                )
        return matches[:limit]
