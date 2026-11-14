"""Use case: cached temporal series. The full computed series (JSON) and every frame (Float32)
are stored through the tiered cache, so a repeated request costs milliseconds.

The JSON shape belongs to the HTTP contract, so the presenter is injected from the API layer.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta

import numpy as np

from skyshift.application.build_series import (
    PIPELINE_VERSION,
    BuildSeries,
    SeriesRequest,
    SeriesResult,
)
from skyshift.application.tiered_cache import Resolved, TieredResolver
from skyshift.ports.origin import Fetched

# Same freshness as the catalog listing: new quick-release images can appear daily.
SERIES_TTL = timedelta(hours=24)
PIPELINE_URL = f"skyshift:pipeline/{PIPELINE_VERSION}"

Presenter = Callable[[SeriesResult], bytes]


def frame_key(series_id: str, index: int) -> str:
    return f"frame:{series_id}:{index}"


@dataclass(frozen=True, slots=True)
class GetSeries:
    build: BuildSeries
    resolver: TieredResolver
    present: Presenter

    async def __call__(self, request: SeriesRequest) -> Resolved:
        async def compute() -> Fetched:
            result = await self.build(request)
            for frame in result.frames:
                data = np.ascontiguousarray(frame.data, dtype="<f4").tobytes()
                await self.resolver.put(
                    frame_key(result.series_id, frame.index), data, PIPELINE_URL
                )
            return Fetched(self.present(result), PIPELINE_URL)

        return await self.resolver.get(f"series:{request.series_id()}", compute, ttl=SERIES_TTL)

    async def frame(self, series_id: str, index: int) -> Resolved | None:
        return await self.resolver.peek(frame_key(series_id, index))
