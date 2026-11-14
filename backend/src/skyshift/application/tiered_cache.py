"""Tiered resolver ("redireccionador", ADR 0006): memory → precomputed → local disk → origin.

Guarantees:
- One origin call per key at a time (single-flight), however many concurrent requests.
- Validated payloads only are stored; a 404 is never cached.
- When the origin fails, an expired local copy is served marked `stale`, with its original
  `retrieved_at` (old data is never presented as new). With no copy → UpstreamUnavailable.
- A circuit breaker stops hammering the origin after repeated failures.
"""

import asyncio
import hashlib
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Literal

from skyshift.ports.origin import Fetched, OriginError
from skyshift.ports.storage import BlobMeta, BlobStore, StoredBlob

Clock = Callable[[], datetime]
Validator = Callable[[bytes], None]


def utc_now() -> datetime:
    return datetime.now(UTC)


class CacheLayer(StrEnum):
    MEMORY = "memory"
    PRECOMPUTED = "precomputed"
    LOCAL = "local"
    ORIGIN = "origin"


class UpstreamUnavailable(Exception):
    """No usable copy and the origin cannot be reached (or the circuit is open)."""


@dataclass(frozen=True, slots=True)
class Resolved:
    data: bytes
    layer: CacheLayer
    meta: BlobMeta
    stale: bool = False


BreakerState = Literal["closed", "open", "half_open"]


class CircuitBreaker:
    def __init__(
        self, failure_threshold: int, reset_after: timedelta, clock: Clock = utc_now
    ) -> None:
        self._threshold = failure_threshold
        self._reset_after = reset_after
        self._clock = clock
        self._failures = 0
        self._opened_at: datetime | None = None
        self._half_open_trial = False

    @property
    def state(self) -> BreakerState:
        if self._opened_at is None:
            return "closed"
        if self._clock() - self._opened_at >= self._reset_after:
            return "half_open"
        return "open"

    def allow(self) -> bool:
        state = self.state
        if state == "closed":
            return True
        if state == "half_open" and not self._half_open_trial:
            self._half_open_trial = True
            return True
        return False

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._half_open_trial = False

    def record_failure(self) -> None:
        self._failures += 1
        self._half_open_trial = False
        if self._failures >= self._threshold or self._opened_at is not None:
            self._opened_at = self._clock()


class _MemoryLru:
    def __init__(self, max_bytes: int) -> None:
        self._max_bytes = max_bytes
        self._bytes = 0
        self._items: OrderedDict[str, StoredBlob] = OrderedDict()

    def get(self, key: str) -> StoredBlob | None:
        item = self._items.get(key)
        if item is not None:
            self._items.move_to_end(key)
        return item

    def put(self, key: str, blob: StoredBlob) -> None:
        if len(blob.data) > self._max_bytes:
            return
        old = self._items.pop(key, None)
        if old is not None:
            self._bytes -= len(old.data)
        self._items[key] = blob
        self._bytes += len(blob.data)
        while self._bytes > self._max_bytes:
            _, evicted = self._items.popitem(last=False)
            self._bytes -= len(evicted.data)


class TieredResolver:
    def __init__(
        self,
        store: BlobStore,
        *,
        precomputed: BlobStore | None = None,
        clock: Clock = utc_now,
        breaker: CircuitBreaker | None = None,
        memory_max_bytes: int = 256 * 1024 * 1024,
    ) -> None:
        self._store = store
        self._precomputed = precomputed
        self._clock = clock
        self.breaker = breaker or CircuitBreaker(5, timedelta(seconds=30), clock)
        self._memory = _MemoryLru(memory_max_bytes)
        self._inflight: dict[str, asyncio.Task[Resolved]] = {}

    async def get(
        self,
        key: str,
        fetch: Callable[[], Awaitable[Fetched]],
        *,
        ttl: timedelta | None = None,
        validate: Validator | None = None,
    ) -> Resolved:
        cached = self._memory.get(key)
        if cached is not None and self._is_fresh(cached.meta):
            return Resolved(cached.data, CacheLayer.MEMORY, cached.meta)

        if self._precomputed is not None:
            seeded = await self._precomputed.get(key)
            if seeded is not None:
                self._memory.put(key, seeded)
                return Resolved(seeded.data, CacheLayer.PRECOMPUTED, seeded.meta)

        local = await self._store.get(key)
        if local is not None and self._is_fresh(local.meta):
            self._memory.put(key, local)
            return Resolved(local.data, CacheLayer.LOCAL, local.meta)

        task = self._inflight.get(key)
        if task is None:
            task = asyncio.create_task(self._from_origin(key, fetch, ttl, validate, local))
            self._inflight[key] = task
            task.add_done_callback(lambda _: self._inflight.pop(key, None))
        return await asyncio.shield(task)

    def _is_fresh(self, meta: BlobMeta) -> bool:
        return meta.expires_at is None or self._clock() < meta.expires_at

    async def _from_origin(
        self,
        key: str,
        fetch: Callable[[], Awaitable[Fetched]],
        ttl: timedelta | None,
        validate: Validator | None,
        stale: StoredBlob | None,
    ) -> Resolved:
        if not self.breaker.allow():
            return self._stale_or_raise(stale, "upstream circuit open")
        try:
            fetched = await fetch()
        except OriginError as exc:
            self.breaker.record_failure()
            return self._stale_or_raise(stale, str(exc))
        self.breaker.record_success()

        if validate is not None:
            validate(fetched.data)

        now = self._clock()
        meta = BlobMeta(
            source_url=fetched.source_url,
            retrieved_at=now,
            sha256=hashlib.sha256(fetched.data).hexdigest(),
            expires_at=now + ttl if ttl is not None else None,
        )
        await self._store.put(key, fetched.data, meta)
        self._memory.put(key, StoredBlob(fetched.data, meta))
        return Resolved(fetched.data, CacheLayer.ORIGIN, meta)

    @staticmethod
    def _stale_or_raise(stale: StoredBlob | None, reason: str) -> Resolved:
        if stale is None:
            raise UpstreamUnavailable(reason)
        return Resolved(stale.data, CacheLayer.LOCAL, stale.meta, stale=True)
