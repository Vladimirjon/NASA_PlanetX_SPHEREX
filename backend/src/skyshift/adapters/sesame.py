"""CDS Sesame name resolver (SIMBAD/NED/VizieR). Positions are J2000; motion when available.

XML is parsed with defusedxml (external input).
"""

import asyncio
from urllib.parse import quote, urljoin, urlsplit

import httpx
from defusedxml import ElementTree

from skyshift.adapters.http import Sleep, get_with_retry
from skyshift.domain.position import InvalidPosition, SkyPosition
from skyshift.ports.origin import Fetched, InvalidPayload, OriginError
from skyshift.ports.resolver import ResolvedTarget

SESAME = "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?"


class SesameResolver:
    def __init__(self, client: httpx.AsyncClient, *, sleep: Sleep = asyncio.sleep) -> None:
        self._client = client
        self._sleep = sleep

    def cache_key(self, name: str) -> str:
        return f"sesame:{' '.join(name.lower().split())}"

    async def fetch(self, name: str) -> Fetched:
        url = SESAME + quote(name, safe="")
        try:
            response = await get_with_retry(self._client, url, sleep=self._sleep)
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location", "")
                destination = urlsplit(urljoin(url, location))
                if (
                    destination.scheme != "https"
                    or destination.hostname
                    not in {"cds.unistra.fr", "vizier.cds.unistra.fr", "vizier.idia.ac.za"}
                    or destination.port not in {None, 443}
                    or destination.username is not None
                    or not destination.path.endswith("/nph-sesame/-ox/SNV")
                ):
                    raise OriginError("Sesame returned an untrusted redirect")
                response = await get_with_retry(
                    self._client, destination.geturl(), sleep=self._sleep
                )
        except httpx.HTTPError as exc:
            raise OriginError(f"Sesame request failed: {type(exc).__name__}") from exc
        if response.status_code != 200:
            raise OriginError(f"Sesame answered HTTP {response.status_code}")
        return Fetched(data=response.content, source_url=url)

    def parse(self, data: bytes) -> ResolvedTarget | None:
        try:
            root = ElementTree.fromstring(data)
        except ElementTree.ParseError as exc:
            raise InvalidPayload("Sesame returned invalid XML") from exc
        resolver = root.find("./Target/Resolver")
        if resolver is None:
            return None
        ra, dec = resolver.findtext("jradeg"), resolver.findtext("jdedeg")
        if ra is None or dec is None:
            return None
        try:
            position = SkyPosition(float(ra) % 360.0, float(dec))
        except (ValueError, InvalidPosition) as exc:
            raise InvalidPayload("Sesame returned an invalid position") from exc
        # Sesame provides J2000 frame coordinates but not a position epoch here.
        # Motion cannot safely be propagated without the latter.
        return ResolvedTarget(
            canonical_name=(resolver.findtext("oname") or "").removeprefix("NAME ").strip(),
            position=position,
            motion=None,
            epoch_label="J2000.0 frame; position epoch unspecified",
            source=f"CDS Sesame ({resolver.get('name', 'resolver')})",
        )
