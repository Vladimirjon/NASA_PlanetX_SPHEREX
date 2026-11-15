"""IRSA Gator cone search on Gaia DR3 (`gaia_dr3_source`), IPAC-table output.

Same service Sebastián used for spec 0032 §4.1 and D12 §7. Read-only, no key needed.
Positions are at the Gaia reference epoch (J2016.0, column `ref_epoch`).
"""

import asyncio

import httpx

from skyshift.adapters.http import Sleep, get_with_retry
from skyshift.domain.measurement.registration import CatalogStar
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import Fetched, InvalidPayload, OriginError

GATOR_URL = "https://irsa.ipac.caltech.edu/cgi-bin/Gator/nph-query"
COLUMNS = "source_id,ra,dec,pmra,pmdec,parallax,phot_g_mean_mag,ruwe,ref_epoch"
MAX_RADIUS_ARCSEC = 900.0


class IrsaGaiaDr3:
    name = "Gaia DR3 (IRSA Gator gaia_dr3_source)"

    def __init__(self, client: httpx.AsyncClient, *, sleep: Sleep = asyncio.sleep) -> None:
        self._client = client
        self._sleep = sleep

    def cache_key(self, center: SkyPosition, radius_arcsec: float) -> str:
        return f"gaia_dr3:{center.ra_deg:.4f}:{center.dec_deg:.4f}:{radius_arcsec:.0f}"

    async def fetch(self, center: SkyPosition, radius_arcsec: float) -> Fetched:
        if not 0 < radius_arcsec <= MAX_RADIUS_ARCSEC:
            raise ValueError(f"radius must be in (0, {MAX_RADIUS_ARCSEC}] arcsec")
        params = {
            "spatial": "cone",
            "catalog": "gaia_dr3_source",
            "objstr": f"{center.ra_deg:.6f} {center.dec_deg:+.6f}",
            "radius": f"{radius_arcsec:.1f}",
            "radunits": "arcsec",
            "outfmt": "1",
            "selcols": COLUMNS,
        }
        try:
            response = await get_with_retry(
                self._client, GATOR_URL, params=params, sleep=self._sleep
            )
        except httpx.HTTPError as exc:
            raise OriginError(f"IRSA Gator request failed: {type(exc).__name__}") from exc
        if response.status_code != 200:
            raise OriginError(f"IRSA Gator answered HTTP {response.status_code}")
        return Fetched(data=response.content, source_url=str(response.url))

    def parse(self, data: bytes) -> list[CatalogStar]:
        return parse_ipac_gaia(data)


def _num(value: str) -> float | None:
    if value in ("null", ""):
        return None
    try:
        return float(value)
    except ValueError as exc:
        raise InvalidPayload(f"not a number in Gaia table: {value!r}") from exc


def parse_ipac_gaia(data: bytes) -> list[CatalogStar]:
    """Parse an IPAC table from Gator. Raises InvalidPayload on anything unexpected."""
    try:
        text = data.decode("ascii")
    except UnicodeDecodeError as exc:
        raise InvalidPayload("Gaia table is not ASCII") from exc
    lines = text.splitlines()
    header = next((ln for ln in lines if ln.startswith("|")), None)
    if header is None or ("ERROR" in text[:2000].upper() and "source_id" not in text):
        raise InvalidPayload("Gator response has no IPAC table header")
    names = [h.strip() for h in header.strip("|").split("|")]
    required = ("source_id", "ra", "dec", "pmra", "pmdec", "parallax", "phot_g_mean_mag", "ruwe")
    if any(col not in names for col in required):
        raise InvalidPayload(f"Gaia table lacks columns: {names}")
    idx = {name: i for i, name in enumerate(names)}
    stars: list[CatalogStar] = []
    for line in lines:
        if not line.strip() or line.startswith(("\\", "|")):
            continue
        cells = line.split()
        if len(cells) != len(names):
            raise InvalidPayload("Gaia table row does not match its header")
        ra, dec = _num(cells[idx["ra"]]), _num(cells[idx["dec"]])
        if ra is None or dec is None:
            continue
        epoch = _num(cells[idx["ref_epoch"]]) if "ref_epoch" in idx else 2016.0
        stars.append(
            CatalogStar(
                source_id=cells[idx["source_id"]],
                ra_deg=ra,
                dec_deg=dec,
                epoch_jyear=epoch if epoch is not None else 2016.0,
                pm_ra_masyr=_num(cells[idx["pmra"]]),
                pm_dec_masyr=_num(cells[idx["pmdec"]]),
                parallax_mas=_num(cells[idx["parallax"]]),
                g_mag=_num(cells[idx["phot_g_mean_mag"]]),
                ruwe=_num(cells[idx["ruwe"]]),
            )
        )
    return stars
