# pyright: basic
# Reason: builds a synthetic FITS file with astropy, which ships no type stubs.
"""End-to-end BuildSeries on a synthetic L2 file built from REAL SPHEREx header + WCS-WAVE.

A Gaussian "star" is injected at detector pixel (1000, 1000); the series must put it at the
centre of the common grid in every frame, read only byte ranges, and cache everything.
"""

import gzip
import io
import time
import warnings
from pathlib import Path

import httpx
import numpy as np
import pytest
from astropy.io import fits
from astropy.wcs import WCS, FITSFixedWarning

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.adapters.irsa_sia import IrsaSia2Catalog
from skyshift.adapters.s3_archive import S3ImageArchive
from skyshift.application.build_series import BuildSeries, SeriesRequest
from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations
from skyshift.application.tiered_cache import TieredResolver
from skyshift.domain.position import SkyPosition

pytestmark = pytest.mark.anyio
FIX = Path(__file__).parent / "fixtures"
STAR_PX = (1000.0, 1000.0)


def _synthetic_l2() -> tuple[bytes, SkyPosition]:
    head = (FIX / "l2" / "l2-head.bin").read_bytes()
    header = fits.Header.fromstring(head[2880:].decode("ascii"))
    wave_raw = (FIX / "l2" / "l2-wcswave.bin").read_bytes()
    with fits.open(io.BytesIO(head[:2880] + wave_raw)) as w:
        wave = w[1].copy()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FITSFixedWarning)
        ra, dec = WCS(header).all_pix2world(*STAR_PX, 0)
    yy, xx = np.mgrid[0:2040, 0:2040]
    image = 0.5 + 100 * np.exp(-((xx - STAR_PX[0]) ** 2 + (yy - STAR_PX[1]) ** 2) / (2 * 1.2**2))
    hdul = fits.HDUList(
        [
            fits.PrimaryHDU(),
            fits.ImageHDU(image.astype(np.float32), header=header, name="IMAGE"),
            fits.CompImageHDU(
                np.zeros((2040, 2040), np.int32),
                compression_type="RICE_1",
                tile_shape=(1, 2040),
                name="FLAGS",
            ),
            fits.ImageHDU(np.ones((2040, 2040), np.float32), name="VARIANCE"),
            fits.ImageHDU(np.full((2040, 2040), 0.1, np.float32), name="ZODI"),
            fits.BinTableHDU.from_columns([fits.Column("BINX", "J", array=[1])], name="EPSF"),
            wave,
        ]
    )
    buf = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        hdul.writeto(buf)
    return buf.getvalue(), SkyPosition(float(ra) % 360, float(dec))


FILE, TARGET = _synthetic_l2()


class FakeIrsa:
    def __init__(self) -> None:
        self.s3_calls = 0

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if request.url.host == "irsa.ipac.caltech.edu":
            coll = request.url.params["COLLECTION"]
            return httpx.Response(
                200, content=gzip.decompress((FIX / f"sia-epsindib-{coll}.xml.gz").read_bytes())
            )
        self.s3_calls += 1
        a, b = request.headers["Range"].removeprefix("bytes=").split("-")
        return httpx.Response(206, content=FILE[int(a) : int(b) + 1])


def build(tmp_path: Path, irsa: FakeIrsa) -> BuildSeries:
    client = httpx.AsyncClient(transport=httpx.MockTransport(irsa))
    resolver = TieredResolver(FilesystemBlobStore(tmp_path))
    return BuildSeries(
        ListObservations(resolver, IrsaSia2Catalog(client)),
        FrameReader(resolver, S3ImageArchive(client)),
    )


async def test_series_puts_the_star_at_the_grid_centre_in_every_frame(tmp_path: Path):
    irsa = FakeIrsa()
    use_case = build(tmp_path, irsa)
    t0 = time.perf_counter()
    result = await use_case(SeriesRequest(position=TARGET, fov_arcmin=5.0))
    cold = time.perf_counter() - t0

    assert result.detector == 2  # in all 4 visits (QR3 lacks D1/D4); lowest number wins ties
    assert len(result.frames) == 4  # one per visit: abr-25, oct-25, abr-26, sep-26
    assert result.grid.size % 2 == 1
    c = result.grid.size // 2
    for frame in result.frames:
        peak = np.unravel_index(np.nanargmax(frame.data), frame.data.shape)
        assert abs(peak[0] - c) <= 1
        assert abs(peak[1] - c) <= 1
        assert np.isfinite(frame.data[c - 5 : c + 6, c - 5 : c + 6]).all()
        assert frame.unit.replace(" ", "") == "MJy/sr"
        assert frame.flags_clear_at_target
    assert result.level == "OBSERVED"  # significance not computed yet: never EVALUATED blindly
    names = {ch.name: ch.passed for ch in result.checks}
    assert names["distinct_visits"]
    assert names["wavelength_within_tolerance"]
    assert names["change_significance"] is False

    calls = irsa.s3_calls
    t1 = time.perf_counter()
    again = await use_case(SeriesRequest(position=TARGET, fov_arcmin=5.0))
    warm = time.perf_counter() - t1
    assert irsa.s3_calls == calls  # everything served from cache
    assert len(again.frames) == 4
    print(f"cold {cold:.2f}s warm {warm:.2f}s, S3 range requests {calls}")


async def test_position_without_images_returns_empty_series_with_message(tmp_path: Path):
    class Empty(FakeIrsa):
        def __call__(self, request: httpx.Request) -> httpx.Response:
            if request.url.host == "irsa.ipac.caltech.edu":
                body = gzip.decompress((FIX / "sia-epsindib-spherex_qr3.xml.gz").read_bytes())
                start, end = body.index(b"<TR>"), body.rindex(b"</TR>") + 5
                return httpx.Response(200, content=body[:start] + body[end:])
            return super().__call__(request)

    result = await build(tmp_path, Empty())(SeriesRequest(position=SkyPosition(10.0, 10.0)))
    assert result.frames == ()
    assert any("no published images" in w for w in result.warnings)
