"""IRSA SPHEREx DR1 HiPS cube tiles over HTTP. Translates transport errors to cache errors."""

import asyncio
import struct

import httpx

from skyshift.adapters.http import get_with_retry
from skyshift.domain.hips import HipsTileAddress
from skyshift.ports.origin import Fetched, InvalidPayload, OriginError, OriginNotFound

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
TILE_WIDTH = 512  # hips_tile_width in the service properties
MAX_TILE_BYTES = 4 * 1024 * 1024


class IrsaHipsTiles:
    def __init__(self, client: httpx.AsyncClient, base_url: str, max_parallel: int = 6) -> None:
        self._client = client
        self._base_url = base_url.rstrip("/")
        self._semaphore = asyncio.Semaphore(max_parallel)

    def url_for(self, address: HipsTileAddress) -> str:
        return f"{self._base_url}/{address.path}"

    async def fetch(self, address: HipsTileAddress) -> Fetched:
        url = self.url_for(address)
        try:
            async with self._semaphore:
                response = await get_with_retry(self._client, url)
        except httpx.HTTPError as exc:
            raise OriginError(f"IRSA HiPS request failed: {type(exc).__name__}") from exc
        if response.status_code == 404:
            raise OriginNotFound(f"tile not published: {address.path}")
        if response.status_code != 200:
            raise OriginError(f"IRSA HiPS answered HTTP {response.status_code}")
        return Fetched(data=response.content, source_url=url)

    def validate(self, data: bytes) -> None:
        validate_png_tile(data)


def validate_png_tile(data: bytes) -> None:
    """Accept only a PNG whose IHDR says 512x512; anything else is never cached."""
    if len(data) > MAX_TILE_BYTES:
        raise InvalidPayload("tile larger than allowed")
    if len(data) < 24 or not data.startswith(PNG_SIGNATURE) or data[12:16] != b"IHDR":
        raise InvalidPayload("upstream payload is not a PNG")
    width, height = struct.unpack(">II", data[16:24])
    if (width, height) != (TILE_WIDTH, TILE_WIDTH):
        raise InvalidPayload(f"unexpected tile size {width}x{height}")
