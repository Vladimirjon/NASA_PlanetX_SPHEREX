"""CWAVE/CBAND at a native detector pixel from the SPHEREx Spectral WCS calibration (S3).

Link rule (spec 0001 §3.5, Johann): the calibration is accepted for an image only if (1)
exactly one calibration version is published for that collection and (2) its WCS-WAVE table
is byte-identical to the one embedded in the image. Otherwise `calibration_unresolved`.
Byte-range reads only; nothing is downloaded whole.
"""

import re
from dataclasses import dataclass

import httpx
import numpy as np

from skyshift.domain.fits_bytes import find_header_end, hdu_info

BUCKET = "https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com"
VERSION = re.compile(r"cal-swcs-v\d+-\d{4}-\d{3}")  # e.g. cal-swcs-v5-2026-191
FIRST_CHUNK = 32 * 1024
COLLECTION_DIR = {"spherex_dr1": "dr1", "spherex_qr3": "qr3"}


class CalibrationUnresolved(ValueError):
    """The calibration cannot be linked to the image by the 0001 §3.5 rule."""


@dataclass(frozen=True, slots=True)
class SpectralPixel:
    cwave_um: float
    cband_um: float
    calibration_url: str
    version: str
    link_check: str  # how the link was verified


@dataclass
class S3SpectralWcs:
    client: httpx.AsyncClient

    async def _range(self, url: str, start: int, length: int) -> bytes:
        r = await self.client.get(url, headers={"Range": f"bytes={start}-{start + length - 1}"})
        if r.status_code not in (200, 206):
            raise CalibrationUnresolved(f"HTTP {r.status_code} reading {url}")
        return r.content

    async def _versions(self, collection_dir: str) -> set[str]:
        r = await self.client.get(
            BUCKET + "/", params={"list-type": "2", "prefix": f"{collection_dir}/spectral_wcs/"}
        )
        if r.status_code != 200:
            raise CalibrationUnresolved(f"cannot list spectral_wcs: HTTP {r.status_code}")
        return set(VERSION.findall(r.text))

    async def _hdus(self, url: str) -> dict[str, tuple[int, int, int, int]]:
        """name -> (header_start, data_start, width, next_header_start)."""
        out: dict[str, tuple[int, int, int, int]] = {}
        start = 0
        for i in range(6):
            raw = await self._range(url, start, FIRST_CHUNK)
            if find_header_end(raw) is None:
                raw = await self._range(url, start, FIRST_CHUNK * 8)
            info = hdu_info(raw, start)
            name = info.name if i else "PRIMARY"
            out[name] = (info.header_start, info.data_start, info.width, info.next_header_start)
            if name == "WCS-WAVE":
                break
            start = info.next_header_start
        return out

    async def pixel(
        self, collection: str, detector: int, x: int, y: int, image_wave_hdu: bytes
    ) -> SpectralPixel:
        cdir = COLLECTION_DIR.get(collection)
        if cdir is None:
            raise CalibrationUnresolved(f"unknown collection {collection}")
        versions = await self._versions(cdir)
        if len(versions) != 1:
            raise CalibrationUnresolved(f"{len(versions)} calibration versions published")
        version = versions.pop()
        url = (
            f"{BUCKET}/{cdir}/spectral_wcs/{version}/{detector}/"
            f"spectral_wcs_D{detector}_spx_{version}.fits"
        )
        hdus = await self._hdus(url)
        missing = {"CWAVE", "CBAND", "WCS-WAVE"} - hdus.keys()
        if missing:
            raise CalibrationUnresolved(f"calibration lacks {sorted(missing)}")
        _, w_data, _, w_next = hdus["WCS-WAVE"]
        calib_table = await self._range(url, w_data, w_next - w_data)
        image_info = hdu_info(image_wave_hdu, 0)
        image_table = image_wave_hdu[image_info.data_start : image_info.next_header_start]
        if calib_table != image_table:  # compare the TABLE (data), not the header cards
            raise CalibrationUnresolved("WCS-WAVE table differs from the image's (0001 §3.5)")
        values: list[float] = []
        for name in ("CWAVE", "CBAND"):
            _, data_start, width, _ = hdus[name]
            raw = await self._range(url, data_start + 4 * (y * width + x), 4)
            values.append(float(np.frombuffer(raw, dtype=">f4")[0]))
        return SpectralPixel(
            values[0],
            values[1],
            url,
            version,
            "single version + WCS-WAVE table data byte-identical",
        )
