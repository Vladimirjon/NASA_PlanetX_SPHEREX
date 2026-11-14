"""CDS Sesame name resolver (SIMBAD/NED/VizieR). Positions are J2000; motion when available.

XML is parsed with defusedxml (external input).
"""

import asyncio
from urllib.parse import quote

import httpx
from defusedxml import ElementTree

from skyshift.adapters.http import Sleep, get_with_retry
from skyshift.domain.motion import Motion
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
        pm_ra, pm_de = resolver.findtext("pm/pmRA"), resolver.findtext("pm/pmDE")
        plx = resolver.findtext("plx/v")
        motion = None
        if pm_ra and pm_de:
            motion = Motion(float(pm_ra), float(pm_de), float(plx) if plx else 0.0, 2000.0)
        return ResolvedTarget(
            canonical_name=(resolver.findtext("oname") or "").removeprefix("NAME ").strip(),
            position=position,
            motion=motion,
            epoch_label="J2000.0",
            source=f"CDS Sesame ({resolver.get('name', 'resolver')})",
        )
