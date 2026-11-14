import gzip
from pathlib import Path

import httpx
import pytest

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.adapters.http import get_with_retry
from skyshift.adapters.irsa_sia import IrsaSia2Catalog
from skyshift.application.list_observations import ListObservations
from skyshift.application.tiered_cache import CacheLayer, TieredResolver
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import InvalidPayload

pytestmark = pytest.mark.anyio
FIX = Path(__file__).parent / "fixtures"
EPS_INDI_B = SkyPosition(331.0912, -56.7975)  # propagated to 2026 (D12 §7)


def fixture(collection: str) -> bytes:
    return gzip.decompress((FIX / f"sia-epsindib-{collection}.xml.gz").read_bytes())


class Irsa:
    def __init__(self, failures_before_success: int = 0) -> None:
        self.calls: list[str] = []
        self.failures = failures_before_success

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(str(request.url))
        if self.failures > 0:
            self.failures -= 1
            return httpx.Response(502)
        collection = request.url.params["COLLECTION"]
        return httpx.Response(200, content=fixture(collection))


async def no_sleep(_: float) -> None:
    return None


def catalog(irsa: Irsa) -> IrsaSia2Catalog:
    client = httpx.AsyncClient(transport=httpx.MockTransport(irsa))
    return IrsaSia2Catalog(client, sleep=no_sleep)


async def test_parse_real_response_maps_columns():
    obs = catalog(Irsa()).parse(fixture("spherex_qr3"))
    assert len(obs) == 120
    first = next(o for o in obs if o.obs_did.endswith("2026W39_1A_0276_2/D3"))
    assert first.detector == 3
    assert first.collection == "spherex_qr3"
    assert first.t_min_mjd == pytest.approx(61305.228398)
    assert first.access_url.startswith("https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/")
    assert first.s3_key is not None
    assert first.s3_key.startswith("qr3/level2/")
    assert {o.detector for o in obs} <= {2, 3, 5, 6}  # D12: QR3 of Eps Indi B lacks D1/D4


async def test_parse_rejects_non_votable():
    with pytest.raises(InvalidPayload):
        catalog(Irsa()).parse(b"<html>Proxy Error</html>")


async def test_query_url_is_built_server_side_with_validated_position():
    irsa = Irsa()
    await catalog(irsa).fetch(EPS_INDI_B, "spherex_dr1")
    url = httpx.URL(irsa.calls[0])
    assert url.host == "irsa.ipac.caltech.edu"
    assert url.params["COLLECTION"] == "spherex_dr1"
    assert url.params["POS"].startswith("circle 331.0912")


async def test_retry_recovers_from_two_502():
    irsa = Irsa(failures_before_success=2)
    data = await catalog(irsa).fetch(EPS_INDI_B, "spherex_qr3")
    assert len(irsa.calls) == 3
    assert data.data.startswith(b"<?xml")


async def test_retry_gives_up_and_returns_last_response():
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(503))) as c:
        r = await get_with_retry(c, "https://irsa.ipac.caltech.edu/SIA", attempts=3, sleep=no_sleep)
    assert r.status_code == 503


async def test_list_observations_groups_dr1_and_qr3_into_four_visits(tmp_path: Path):
    irsa = Irsa()
    use_case = ListObservations(TieredResolver(FilesystemBlobStore(tmp_path)), catalog(irsa))
    index = await use_case(EPS_INDI_B)
    # D12 §5.2: Eps Indi B -> abr-25, oct-25, abr-26 (DR1) + sep-26 (QR3)
    assert len(index.visits) == 4
    assert index.visits[-1].observations[0].collection == "spherex_qr3"
    again = await use_case(EPS_INDI_B)
    assert again.cache_layer is CacheLayer.MEMORY
    assert len(irsa.calls) == 2  # one per collection, then cached
