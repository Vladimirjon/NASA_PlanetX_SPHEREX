"""HTTP GET with bounded retries, exponential backoff and jitter.

IRSA answered 502 on 2 of 5 SIA2 calls during our 14-nov measurements; a single retry fixes
most of them. Retries only on transient conditions; 4xx (except 429) are returned at once.
"""

import asyncio
import random
from collections.abc import Awaitable, Callable

import httpx

RETRY_STATUS = frozenset({429, 500, 502, 503, 504})
Sleep = Callable[[float], Awaitable[None]]


async def get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    params: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
    attempts: int = 3,
    backoff_s: float = 0.5,
    sleep: Sleep = asyncio.sleep,
) -> httpx.Response:
    last_error: httpx.TransportError | None = None
    for attempt in range(attempts):
        if attempt:
            # Jitter avoids synchronized retries; not security-relevant.
            await sleep(backoff_s * 2 ** (attempt - 1) * (1 + random.random()))  # noqa: S311
        try:
            response = await client.get(url, params=params, headers=headers)
        except httpx.TransportError as exc:
            last_error = exc
            continue
        if response.status_code not in RETRY_STATUS or attempt == attempts - 1:
            return response
    assert last_error is not None
    raise last_error
