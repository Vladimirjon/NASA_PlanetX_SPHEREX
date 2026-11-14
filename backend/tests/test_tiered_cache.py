import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.application.tiered_cache import (
    CacheLayer,
    CircuitBreaker,
    TieredResolver,
    UpstreamUnavailable,
)
from skyshift.ports.origin import Fetched, InvalidPayload, OriginError, OriginNotFound

pytestmark = pytest.mark.anyio

URL = "https://irsa.ipac.caltech.edu/x"


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class Origin:
    """Fake upstream that counts calls and can be told to fail."""

    def __init__(self, payload: bytes = b"tile") -> None:
        self.calls = 0
        self.payload = payload
        self.error: Exception | None = None
        self.delay = 0.0

    async def __call__(self) -> Fetched:
        self.calls += 1
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.error:
            raise self.error
        return Fetched(data=self.payload, source_url=URL)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def store(tmp_path: Path) -> FilesystemBlobStore:
    return FilesystemBlobStore(tmp_path / "cache")


@pytest.fixture
def resolver(store: FilesystemBlobStore, clock: Clock) -> TieredResolver:
    return TieredResolver(
        store, clock=clock, breaker=CircuitBreaker(3, timedelta(seconds=30), clock)
    )


async def test_miss_goes_to_origin_then_memory(resolver: TieredResolver, clock: Clock):
    origin = Origin()
    first = await resolver.get("k", origin)
    second = await resolver.get("k", origin)
    assert first.layer is CacheLayer.ORIGIN
    assert second.layer is CacheLayer.MEMORY
    assert second.data == b"tile"
    assert origin.calls == 1
    assert first.meta.source_url == URL
    assert first.meta.retrieved_at == clock.now
    assert len(first.meta.sha256) == 64


async def test_local_disk_survives_process_restart(store: FilesystemBlobStore, clock: Clock):
    origin = Origin()
    await TieredResolver(store, clock=clock).get("k", origin)
    fresh_process = TieredResolver(store, clock=clock)
    got = await fresh_process.get("k", origin)
    assert got.layer is CacheLayer.LOCAL
    assert origin.calls == 1


async def test_concurrent_requests_hit_origin_once(resolver: TieredResolver):
    origin = Origin()
    origin.delay = 0.05
    results = await asyncio.gather(*(resolver.get("k", origin) for _ in range(10)))
    assert origin.calls == 1
    assert {r.data for r in results} == {b"tile"}


async def test_expired_entry_is_refetched(resolver: TieredResolver, clock: Clock):
    origin = Origin()
    await resolver.get("k", origin, ttl=timedelta(hours=1))
    clock.now += timedelta(hours=2)
    origin.payload = b"new"
    got = await resolver.get("k", origin, ttl=timedelta(hours=1))
    assert got.layer is CacheLayer.ORIGIN
    assert got.data == b"new"


async def test_stale_served_with_old_date_when_origin_fails(resolver: TieredResolver, clock: Clock):
    origin = Origin()
    first = await resolver.get("k", origin, ttl=timedelta(hours=1))
    clock.now += timedelta(hours=2)
    origin.error = OriginError("502")
    got = await resolver.get("k", origin, ttl=timedelta(hours=1))
    assert got.layer is CacheLayer.LOCAL
    assert got.stale is True
    assert got.meta.retrieved_at == first.meta.retrieved_at  # never presented as new


async def test_miss_with_failing_origin_raises_unavailable(resolver: TieredResolver):
    origin = Origin()
    origin.error = OriginError("timeout")
    with pytest.raises(UpstreamUnavailable):
        await resolver.get("k", origin)


async def test_not_found_propagates_and_is_not_cached(resolver: TieredResolver):
    origin = Origin()
    origin.error = OriginNotFound("404")
    with pytest.raises(OriginNotFound):
        await resolver.get("k", origin)
    with pytest.raises(OriginNotFound):
        await resolver.get("k", origin)
    assert origin.calls == 2


async def test_invalid_payload_is_never_stored(
    resolver: TieredResolver, store: FilesystemBlobStore
):
    def reject(_: bytes) -> None:
        raise InvalidPayload("not a PNG")

    with pytest.raises(InvalidPayload):
        await resolver.get("k", Origin(), validate=reject)
    assert await store.get("k") is None


async def test_circuit_opens_after_threshold_and_skips_origin(
    resolver: TieredResolver, clock: Clock
):
    origin = Origin()
    origin.error = OriginError("502")
    for _ in range(3):
        with pytest.raises(UpstreamUnavailable):
            await resolver.get("k", origin)
    calls = origin.calls
    with pytest.raises(UpstreamUnavailable):
        await resolver.get("other", origin)
    assert origin.calls == calls  # circuit open: origin not contacted
    assert resolver.breaker.state == "open"
    clock.now += timedelta(seconds=31)
    origin.error = None
    got = await resolver.get("other", origin)
    assert got.layer is CacheLayer.ORIGIN
    assert resolver.breaker.state == "closed"


async def test_precomputed_store_is_read_only_and_checked_before_origin(
    tmp_path: Path, clock: Clock
):
    seed = FilesystemBlobStore(tmp_path / "seed")
    await TieredResolver(seed, clock=clock).get("k", Origin(b"demo"))
    local = FilesystemBlobStore(tmp_path / "local")
    resolver = TieredResolver(local, precomputed=seed, clock=clock)
    origin = Origin()
    got = await resolver.get("k", origin)
    assert got.layer is CacheLayer.PRECOMPUTED
    assert got.data == b"demo"
    assert origin.calls == 0


async def test_memory_is_bounded(store: FilesystemBlobStore, clock: Clock):
    resolver = TieredResolver(store, clock=clock, memory_max_bytes=10)
    await resolver.get("a", Origin(b"123456"))
    await resolver.get("b", Origin(b"123456"))
    got = await resolver.get("a", Origin())
    assert got.layer is CacheLayer.LOCAL  # evicted from memory, still on disk


async def test_blob_store_keys_cannot_escape_root(store: FilesystemBlobStore, tmp_path: Path):
    await TieredResolver(store).get("../../etc/passwd", Origin())
    written = [p for p in tmp_path.rglob("*") if p.is_file()]
    assert written
    assert all((tmp_path / "cache") in p.parents for p in written)
