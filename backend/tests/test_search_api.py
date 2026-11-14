from pathlib import Path

import httpx
import pytest

from skyshift.api.app import create_app
from skyshift.config import Settings

pytestmark = pytest.mark.anyio


async def test_resolver_fallback_and_cache(tmp_path: Path):
    requests: list[httpx.Request] = []

    def upstream(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            text=(
                '<Sesame><Target><Resolver name="S"><oname>TEST OBJECT</oname>'
                "<jradeg>12</jradeg><jdedeg>20</jdedeg></Resolver></Target></Sesame>"
            ),
        )

    app = create_app(Settings(cache_dir=tmp_path), upstream_transport=httpx.MockTransport(upstream))
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        first = await client.get("/api/v1/search", params={"q": "zzqq celestial"})
        second = await client.get("/api/v1/search", params={"q": "zzqq celestial"})
        assert first.status_code == 200
        assert first.json()[0]["kind"] == "resolver"
        assert first.json()[0]["ra"] == 12
        assert second.json()[0]["provenance"]["cache_layer"] == "memory"
        assert len(requests) == 1


async def test_coordinates_and_validation(tmp_path: Path):
    app = create_app(
        Settings(cache_dir=tmp_path),
        upstream_transport=httpx.MockTransport(lambda _: httpx.Response(500)),
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "00:42:44 +41:16:09"})
        assert response.status_code == 200
        assert response.json()[0]["kind"] == "coordinates"
        assert response.json()[0]["provenance"]["collection"] == "user-supplied coordinates"
        assert (
            await client.get("/api/v1/search", params={"q": "a", "limit": 21})
        ).status_code == 422


async def test_sesame_redirect_is_followed_to_known_mirror(tmp_path: Path):
    requests: list[str] = []

    def upstream(request: httpx.Request) -> httpx.Response:
        requests.append(request.url.host)
        if request.url.host == "cds.unistra.fr":
            return httpx.Response(
                302,
                headers={
                    "location": "https://vizier.idia.ac.za/viz-bin/nph-sesame/-ox/SNV?uncommon"
                },
            )
        return httpx.Response(
            200,
            text=(
                '<Sesame><Target><Resolver name="S"><oname>Uncommon</oname>'
                "<jradeg>12</jradeg><jdedeg>20</jdedeg></Resolver></Target></Sesame>"
            ),
        )

    app = create_app(Settings(cache_dir=tmp_path), upstream_transport=httpx.MockTransport(upstream))
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "zz uncommon object"})
        assert response.status_code == 200
        assert response.json()[0]["kind"] == "resolver"
        assert requests == ["cds.unistra.fr", "vizier.idia.ac.za"]


async def test_unknown_name_returns_empty_list(tmp_path: Path):
    app = create_app(
        Settings(cache_dir=tmp_path),
        upstream_transport=httpx.MockTransport(
            lambda _: httpx.Response(200, text="<Sesame><Target /></Sesame>")
        ),
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "zzzzzzzzzz"})
        assert response.status_code == 200
        assert response.json() == []


async def test_untrusted_sesame_redirect_is_rejected(tmp_path: Path):
    requests: list[httpx.Request] = []

    def upstream(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            302, headers={"location": "https://attacker.invalid/nph-sesame/-ox/SNV?x"}
        )

    app = create_app(Settings(cache_dir=tmp_path), upstream_transport=httpx.MockTransport(upstream))
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "zzzzzzzzzz"})
        assert response.status_code == 503
        assert len(requests) == 1


async def test_sesame_motion_without_position_epoch_is_not_propagated(tmp_path: Path):
    xml = (
        '<Sesame><Target><Resolver name="S"><oname>Unknown epoch</oname>'
        "<jradeg>12</jradeg><jdedeg>20</jdedeg><pm><pmRA>50</pmRA><pmDE>30</pmDE>"
        "</pm><plx><v>10</v></plx></Resolver></Target></Sesame>"
    )
    app = create_app(
        Settings(cache_dir=tmp_path),
        upstream_transport=httpx.MockTransport(lambda _: httpx.Response(200, text=xml)),
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "zzzzzzzzzz"})
        assert response.status_code == 200
        assert "motion" not in response.json()[0]


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("andromeda", "Andromeda Galaxy"),
        ("andromeada", "Andromeda Galaxy"),
        ("alpha centauri", "Alpha Centauri"),
        ("alfa cen", "Alpha Centauri"),
        ("betelguese", "Betelgeuse"),
        ("m42", "Orion Nebula"),
        ("wise 0855", "WISE 0855-0714"),
    ],
)
async def test_popular_search_does_not_need_network(tmp_path: Path, query: str, expected: str):
    def no_network(_: httpx.Request) -> httpx.Response:
        raise AssertionError("local search attempted a remote call")

    app = create_app(
        Settings(cache_dir=tmp_path), upstream_transport=httpx.MockTransport(no_network)
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": query})
        assert response.status_code == 200
        assert response.json()[0]["name"] == expected
        assert response.json()[0]["provenance"]["source_url"].startswith("https://")


async def test_malformed_sesame_redirect_returns_503(tmp_path: Path):
    app = create_app(
        Settings(cache_dir=tmp_path),
        upstream_transport=httpx.MockTransport(
            lambda _: httpx.Response(
                302, headers={"location": "https://vizier.idia.ac.za:bad/nph-sesame/-ox/SNV?x"}
            )
        ),
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "zzzzzzzzzz"})
        assert response.status_code == 503


async def test_out_of_range_coordinates_are_rejected(tmp_path: Path):
    app = create_app(
        Settings(cache_dir=tmp_path),
        upstream_transport=httpx.MockTransport(lambda _: httpx.Response(500)),
    )
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.get("/api/v1/search", params={"q": "360 91"})
        assert response.status_code == 422
