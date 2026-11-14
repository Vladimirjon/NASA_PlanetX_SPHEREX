# pyright: basic
# Reason: astropy ships no type stubs. This module is the typed boundary for FITS bytes:
# it takes raw bytes and returns plain dataclasses / numpy arrays.
"""Read only the bytes we need from SPHEREx L2 FITS files (D12 §2).

Layout: PRIMARY, IMAGE (float32), FLAGS (RICE_1 tile-compressed, one tile per row),
VARIANCE, ZODI (float32), EPSF (table), WCS-WAVE (table). Measured on S3: reading 31 rows
of 4 HDUs by byte range ≈ 4 s / 0.8 MB versus 9-19 s / 4 MB for the IBE cutout.
"""

import io
import warnings
from dataclasses import dataclass
from typing import cast

import numpy as np
import numpy.typing as npt
from astropy.io import fits
from astropy.wcs import WCS, FITSFixedWarning

BLOCK = 2880
CARD = 80
END_CARD = b"END" + b" " * 77


@dataclass(frozen=True, slots=True)
class HduInfo:
    name: str
    header_start: int
    data_start: int
    data_len: int
    compressed: bool
    width: int  # image width in pixels (ZNAXIS1 when compressed)
    height: int
    table_row_bytes: int  # NAXIS1 of the compressed table (descriptor size)

    @property
    def next_header_start(self) -> int:
        return self.data_start + (self.data_len + BLOCK - 1) // BLOCK * BLOCK

    @property
    def heap_start(self) -> int:
        return self.data_start + self.table_row_bytes * self.height


@dataclass(frozen=True, slots=True)
class ImageMeta:
    detector: int
    mjd_avg: float
    survey_epa_deg: int
    finast: int
    l2dqa_pass: bool
    naxis1: int
    naxis2: int
    bunit: str


@dataclass(frozen=True, slots=True)
class LocalWavelength:
    x: float  # 0-based detector pixel of the target
    y: float
    wavelength_um: float
    bandwidth_um: float
    sip_effect_nm: float  # how wrong λ would be if SIP were kept on the W axis


def find_header_end(chunk: bytes) -> int | None:
    """Length of the header (multiple of 2880) if its END card is inside `chunk`."""
    for i in range(0, len(chunk) - CARD + 1, CARD):
        if chunk[i : i + CARD] == END_CARD:
            return (i // BLOCK + 1) * BLOCK
    return None


def _header(header_bytes: bytes) -> fits.Header:
    end = find_header_end(header_bytes)
    if end is None:
        raise ValueError("incomplete FITS header")
    return fits.Header.fromstring(header_bytes[:end].decode("ascii"))


def _get(h: fits.Header, key: str, default: object = None) -> object:
    value: object = h.get(key, default)
    if value is None:
        raise ValueError(f"FITS keyword {key} missing")
    return value


def _int(h: fits.Header, key: str, default: int | None = None) -> int:
    value = _get(h, key, default)
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        raise ValueError(f"FITS keyword {key} is not numeric")
    return int(value)


def _float(h: fits.Header, key: str, default: float | None = None) -> float:
    value = _get(h, key, default)
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        raise ValueError(f"FITS keyword {key} is not numeric")
    return float(value)


def _str(h: fits.Header, key: str, default: str | None = None) -> str:
    return str(_get(h, key, default)).strip()


def _bool(h: fits.Header, key: str) -> bool:
    return _get(h, key, False) is True


def hdu_info(header_bytes: bytes, header_start: int) -> HduInfo:
    end = find_header_end(header_bytes)
    if end is None:
        raise ValueError("incomplete FITS header")
    h = _header(header_bytes)
    naxis = _int(h, "NAXIS")
    data_len = 0
    if naxis:
        data_len = abs(_int(h, "BITPIX")) // 8
        for i in range(1, naxis + 1):
            data_len *= _int(h, f"NAXIS{i}")
        data_len += _int(h, "PCOUNT", 0)
    compressed = _bool(h, "ZIMAGE")
    return HduInfo(
        name=_str(h, "EXTNAME", "PRIMARY"),
        header_start=header_start,
        data_start=header_start + end,
        data_len=data_len,
        compressed=compressed,
        width=_int(h, "ZNAXIS1" if compressed else "NAXIS1", 0),
        height=_int(h, "ZNAXIS2" if compressed else "NAXIS2", 0),
        table_row_bytes=_int(h, "NAXIS1") if compressed else 0,
    )


def float_rows_range(info: HduInfo, y0: int, rows: int) -> tuple[int, int]:
    bpp = 4
    return info.data_start + y0 * info.width * bpp, rows * info.width * bpp


def decode_float_rows(raw: bytes, width: int) -> npt.NDArray[np.float32]:
    return np.frombuffer(raw, dtype=">f4").reshape(-1, width).astype(np.float32)


def row_descriptor_range(info: HduInfo, y0: int, rows: int) -> tuple[int, int]:
    if not info.compressed:
        raise ValueError("HDU is not tile-compressed")
    return info.data_start + y0 * info.table_row_bytes, rows * info.table_row_bytes


def _descriptors(info_row_bytes: int, raw: bytes) -> npt.NDArray[np.int64]:
    dtype = ">i4" if info_row_bytes == 8 else ">i8"
    return np.frombuffer(raw, dtype=dtype).reshape(-1, 2).astype(np.int64)


def heap_range(info: HduInfo, descriptor_bytes: bytes) -> tuple[int, int]:
    """Contiguous heap span covering the tiles (rows) described by `descriptor_bytes`."""
    d = _descriptors(info.table_row_bytes, descriptor_bytes)
    start = int(d[:, 1].min())
    end = int((d[:, 1] + d[:, 0]).max())
    return info.heap_start + start, end - start


def decode_compressed_rows(
    header_bytes: bytes, descriptor_bytes: bytes, heap: bytes
) -> npt.NDArray[np.int32]:
    """Decode a few RICE rows by building a tiny valid compressed HDU with only those tiles."""
    h = _header(header_bytes)
    row_bytes = _int(h, "NAXIS1")
    d = _descriptors(row_bytes, descriptor_bytes)
    base = int(d[:, 1].min())
    rebased = d.copy()
    rebased[:, 1] -= base
    rows = len(d)
    h["NAXIS2"] = rows
    h["ZNAXIS2"] = rows
    h["PCOUNT"] = len(heap)
    h.pop("THEAP", None)
    table = rebased.astype(">i4" if row_bytes == 8 else ">i8").tobytes()
    payload = table + heap
    payload += bytes((-len(payload)) % BLOCK)
    primary = fits.PrimaryHDU().header.tostring().encode("ascii")
    blob = primary + h.tostring().encode("ascii") + payload
    with fits.open(io.BytesIO(blob)) as hdul:
        hdu = cast(fits.CompImageHDU, hdul[1])
        return np.asarray(hdu.data, dtype=np.int32)


def image_meta(header_bytes: bytes) -> ImageMeta:
    h = _header(header_bytes)
    return ImageMeta(
        detector=_int(h, "DETECTOR"),
        mjd_avg=_float(h, "MJD-AVG"),
        survey_epa_deg=round(_float(h, "SPS_EPA", 0.0)) % 360,
        finast=_int(h, "FINAST", -1),
        l2dqa_pass=_str(h, "L2DQAFLG", "").lower() == "pass",
        naxis1=_int(h, "NAXIS1"),
        naxis2=_int(h, "NAXIS2"),
        bunit=_str(h, "BUNIT", ""),
    )


def spatial_wcs(header_bytes: bytes) -> WCS:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FITSFixedWarning)
        return WCS(_header(header_bytes))


def local_wavelength(
    image_header_bytes: bytes, wave_hdu_bytes: bytes, ra_deg: float, dec_deg: float
) -> LocalWavelength:
    """λ at the target: spatial WCS WITH SIP, then the W (WAVE-TAB) axis WITHOUT SIP (D12 §2.2)."""
    header = _header(image_header_bytes)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FITSFixedWarning)
        x, y = WCS(header).all_world2pix(ra_deg, dec_deg, 0)
        primary = fits.PrimaryHDU()
        image = fits.ImageHDU(header=header)
        wave = _table_hdu(wave_hdu_bytes)
        hdul = fits.HDUList([primary, image, wave])
        wcs_w = WCS(header, fobj=hdul, key="W")
        with_sip = wcs_w.pixel_to_world_values(float(x), float(y))
        wcs_w.sip = None
        lam, bw = wcs_w.pixel_to_world_values(float(x), float(y))
    return LocalWavelength(
        x=float(x),
        y=float(y),
        wavelength_um=float(lam),
        bandwidth_um=float(bw),
        sip_effect_nm=abs(float(with_sip[0]) - float(lam)) * 1000,
    )


def _table_hdu(hdu_bytes: bytes) -> fits.BinTableHDU:
    primary = fits.PrimaryHDU().header.tostring().encode("ascii")
    hdul = fits.open(io.BytesIO(primary + hdu_bytes), lazy_load_hdus=False)
    table = cast(fits.BinTableHDU, hdul[1]).copy()
    hdul.close()
    return table
