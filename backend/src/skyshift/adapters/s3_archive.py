"""Byte ranges from the public SPHEREx bucket (nasa-irsa-spherex, us-east-1, no credentials).

Only keys validated by the SIA2 adapter (bucket allow-list, no traversal) are ever requested.
"""

import asyncio

import httpx

from skyshift.adapters.http import Sleep, get_with_retry
from skyshift.domain.observation import Observation
from skyshift.ports.origin import Fetched, OriginError, OriginNotFound

S3_BASE = "https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/"


class S3ImageArchive:
    def __init__(
        self, client: httpx.AsyncClient, *, max_parallel: int = 16, sleep: Sleep = asyncio.sleep
    ) -> None:
        self._client = client
        self._limit = asyncio.Semaphore(max_parallel)
        self._sleep = sleep

    def range_key(self, observation: Observation, start: int, length: int) -> str:
        return f"s3:{observation.obs_did}:{start}:{length}"

    async def fetch_range(self, observation: Observation, start: int, length: int) -> Fetched:
        if observation.s3_key is None:
            raise OriginNotFound(f"no S3 copy listed for {observation.obs_did}")
        if start < 0 or length <= 0:
            raise ValueError("invalid byte range")
        url = S3_BASE + observation.s3_key
        headers = {"Range": f"bytes={start}-{start + length - 1}"}
        async with self._limit:
            try:
                response = await get_with_retry(
                    self._client, url, headers=headers, sleep=self._sleep
                )
            except httpx.HTTPError as exc:
                raise OriginError(f"S3 range request failed: {type(exc).__name__}") from exc
        if response.status_code == 404:
            raise OriginNotFound(f"S3 object missing: {observation.s3_key}")
        if response.status_code not in (200, 206):
            raise OriginError(f"S3 answered HTTP {response.status_code}")
        data = response.content if response.status_code == 206 else response.content[start:]
        return Fetched(data=data[:length], source_url=url)
