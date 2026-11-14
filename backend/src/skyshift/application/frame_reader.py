"""Read just the needed bytes of an L2 image, every range cached immutably (ADR 0040).

Headers are walked once per image (PRIMARY → IMAGE → FLAGS → VARIANCE → ZODI → EPSF →
WCS-WAVE) and cached forever; the WCS-WAVE table is fixed per detector and product version
(D12 §2.2) so it is fetched once per (detector, version).
"""

import asyncio
import re
from dataclasses import dataclass, field

import numpy as np
import numpy.typing as npt

from skyshift.application.tiered_cache import TieredResolver
from skyshift.domain.fits_bytes import (
    HduInfo,
    decode_compressed_rows,
    decode_float_rows,
    find_header_end,
    float_rows_range,
    hdu_info,
    heap_range,
    row_descriptor_range,
)
from skyshift.domain.observation import Observation
from skyshift.ports.archive import ImageArchive

FIRST_CHUNK = 32 * 1024
MAX_HEADER = 1024 * 1024
PRODUCT_VERSION = re.compile(r"(l2b-v\d+)")
F32 = npt.NDArray[np.float32]
I32 = npt.NDArray[np.int32]


@dataclass(frozen=True, slots=True)
class HeaderChain:
    image_header: bytes
    hdus: dict[str, HduInfo]
    flags_header: bytes


@dataclass(frozen=True, slots=True)
class Box:
    x0: int
    y0: int
    image: F32
    flags: I32
    variance: F32
    zodi: F32


@dataclass
class FrameReader:
    resolver: TieredResolver
    archive: ImageArchive
    _wave_tables: dict[str, bytes] = field(default_factory=dict[str, bytes])
    _wave_locks: dict[str, asyncio.Lock] = field(default_factory=dict[str, asyncio.Lock])

    async def _range(self, obs: Observation, start: int, length: int) -> bytes:
        resolved = await self.resolver.get(
            self.archive.range_key(obs, start, length),
            lambda: self.archive.fetch_range(obs, start, length),
        )
        return resolved.data

    async def _header_at(self, obs: Observation, start: int) -> bytes:
        length = FIRST_CHUNK
        while length <= MAX_HEADER:
            chunk = await self._range(obs, start, length)
            if find_header_end(chunk) is not None:
                return chunk
            length *= 4
        raise ValueError(f"FITS header too large at {start} in {obs.obs_did}")

    async def image_header(self, obs: Observation) -> tuple[bytes, HduInfo]:
        """PRIMARY + IMAGE headers usually fit in the first 32 KB: one range request."""
        first = await self._header_at(obs, 0)
        start = hdu_info(first, 0).next_header_start
        tail = first[start:]
        image = tail if find_header_end(tail) is not None else await self._header_at(obs, start)
        return image, hdu_info(image, start)

    async def chain(self, obs: Observation) -> HeaderChain:
        image_bytes, image = await self.image_header(obs)
        hdus = {"IMAGE": image}
        flags_header = b""
        start = image.next_header_start
        for _ in range(6):
            raw = await self._header_at(obs, start)
            info = hdu_info(raw, start)
            hdus[info.name] = info
            if info.name == "FLAGS":
                flags_header = raw
            if info.name == "WCS-WAVE":
                break
            start = info.next_header_start
        missing = {"FLAGS", "VARIANCE", "ZODI", "WCS-WAVE"} - hdus.keys()
        if missing:
            raise ValueError(f"{obs.obs_did} lacks HDUs {sorted(missing)}")
        return HeaderChain(image_bytes, hdus, flags_header)

    async def wave_table(self, obs: Observation) -> bytes:
        version = PRODUCT_VERSION.search(obs.access_url)
        key = f"{obs.detector}:{version.group(1) if version else obs.obs_did}"
        lock = self._wave_locks.setdefault(key, asyncio.Lock())
        async with lock:
            if key not in self._wave_tables:
                wave = (await self.chain(obs)).hdus["WCS-WAVE"]
                end = wave.next_header_start
                self._wave_tables[key] = await self._range(
                    obs, wave.header_start, end - wave.header_start
                )
            return self._wave_tables[key]

    async def read_box(
        self, obs: Observation, chain: HeaderChain, x0: int, y0: int, size: int
    ) -> Box:
        """Box of `size`x`size` detector pixels; outside the detector is NaN (flags 0)."""
        image = chain.hdus["IMAGE"]
        width, height = image.width, image.height
        ry0, ry1 = max(0, y0), min(height, y0 + size)
        rx0, rx1 = max(0, x0), min(width, x0 + size)
        if ry1 <= ry0 or rx1 <= rx0:
            raise ValueError("box outside detector")
        rows = ry1 - ry0

        async def floats(name: str) -> F32:
            start, length = float_rows_range(chain.hdus[name], ry0, rows)
            return decode_float_rows(await self._range(obs, start, length), width)[:, rx0:rx1]

        async def flags() -> I32:
            info = chain.hdus["FLAGS"]
            d_start, d_len = row_descriptor_range(info, ry0, rows)
            descriptors = await self._range(obs, d_start, d_len)
            h_start, h_len = heap_range(info, descriptors)
            heap = await self._range(obs, h_start, h_len)
            return decode_compressed_rows(chain.flags_header, descriptors, heap)[:, rx0:rx1]

        img, var, zodi, flg = await asyncio.gather(
            floats("IMAGE"), floats("VARIANCE"), floats("ZODI"), flags()
        )

        return Box(
            x0=x0,
            y0=y0,
            image=_place_float(img, size, rx0 - x0, ry0 - y0),
            flags=_place_int(flg, size, rx0 - x0, ry0 - y0),
            variance=_place_float(var, size, rx0 - x0, ry0 - y0),
            zodi=_place_float(zodi, size, rx0 - x0, ry0 - y0),
        )


def _place_float(part: F32, size: int, dx: int, dy: int) -> F32:
    out = np.full((size, size), np.nan, dtype=np.float32)
    out[dy : dy + part.shape[0], dx : dx + part.shape[1]] = part
    return out


def _place_int(part: I32, size: int, dx: int, dy: int) -> I32:
    out = np.zeros((size, size), dtype=np.int32)
    out[dy : dy + part.shape[0], dx : dx + part.shape[1]] = part
    return out
