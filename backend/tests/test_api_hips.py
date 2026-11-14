import struct
import zlib
from collections.abc import AsyncIterator, Callable
from pathlib import Path

import httpx
import pytest

from skyshift.api.app import create_app
from skyshift.config import Settings

pytestmark = pytest.mark.anyio

BASE = "https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube"


def png(width: int = 512, height: int = 512) -> bytes:
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0)
    chunk = struct.pack(">I", len(ihdr)) + b"IHDR" + ihdr
    chunk += struct.pack(">I", zlib.crc32(b"IHDR" + ihdr))
    return b"\x89PNG\r\n\x1a\n" + chunk + b"\x00\x00\x00\x00IEND\xaeB`\x82"


Handler = Callable[[httpx.Request], httpx.Response]


class Upstream:
    def __init__(self) -> None:
        self.requests: list[str] = []
        self.handler: Handler = lambda _: httpx.Response(200, content=png())

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(str(request.url))
        return self.handler(request)


@pytest.fixture
def upstream() -> Upstream:
    return Upstream()


@pytest.fixture
async def client(tmp_path: Path, upstream: Upstream) -> AsyncIterator[httpx.AsyncClient]:
    settings = Settings(cache_dir=tmp_path / "cache", hips_base_url=BASE)
    app = create_app(settings, upstream_transport=httpx.MockTransport(upstream))
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c,
    ):
        yield c


async def test_tile_is_fetched_once_then_served_from_cache(
    client: httpx.AsyncClient, upstream: Upstream
):
    first = await client.get("/api/v1/hips/3/0/10", params={"plane": 19})
    second = await client.get("/api/v1/hips/3/0/10", params={"plane": 19})
    assert first.status_code == 200
    assert first.headers["content-type"] == "image/png"
    assert first.headers["x-cache-layer"] == "origin"
    assert second.headers["x-cache-layer"] == "memory"
    assert upstream.requests == [f"{BASE}/Norder3/Dir0/Npix10_19.png"]


async def test_invalid_address_is_422_problem(client: httpx.AsyncClient, upstream: Upstream):
    r = await client.get("/api/v1/hips/5/0/12000")  # dir must be 10000
    assert r.status_code == 422
    assert r.headers["content-type"] == "application/problem+json"
    assert r.json()["status"] == 422
    assert upstream.requests == []


async def test_out_of_range_plane_is_422(client: httpx.AsyncClient):
    r = await client.get("/api/v1/hips/0/0/0", params={"plane": 102})
    assert r.status_code == 422


async def test_upstream_404_is_404_problem(client: httpx.AsyncClient, upstream: Upstream):
    upstream.handler = lambda _: httpx.Response(404)
    r = await client.get("/api/v1/hips/4/0/7")
    assert r.status_code == 404
    assert r.headers["content-type"] == "application/problem+json"


async def test_upstream_down_without_copy_is_503(client: httpx.AsyncClient, upstream: Upstream):
    upstream.handler = lambda _: httpx.Response(502)
    r = await client.get("/api/v1/hips/4/0/7")
    assert r.status_code == 503
    assert r.json()["title"]


async def test_non_png_payload_is_rejected_not_cached(
    client: httpx.AsyncClient, upstream: Upstream
):
    upstream.handler = lambda _: httpx.Response(200, content=b"<html>proxy error</html>")
    r = await client.get("/api/v1/hips/4/0/8")
    assert r.status_code == 503
    upstream.handler = lambda _: httpx.Response(200, content=png())
    ok = await client.get("/api/v1/hips/4/0/8")
    assert ok.headers["x-cache-layer"] == "origin"


async def test_wrong_tile_size_is_rejected(client: httpx.AsyncClient, upstream: Upstream):
    upstream.handler = lambda _: httpx.Response(200, content=png(64, 64))
    r = await client.get("/api/v1/hips/4/0/9")
    assert r.status_code == 503


async def test_health_reports_breaker_state(client: httpx.AsyncClient):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "upstream": {"irsa": "closed"}}
