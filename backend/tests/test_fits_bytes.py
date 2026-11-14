"""Byte-range FITS reading against a real SPHEREx QR3 L2 file (Eps Indi B, D3).

Fixtures are real bytes from S3 (tests/fixtures/l2); FLAGS ground truth was produced by
decoding the WHOLE compressed HDU with astropy, so the partial decoder is checked
independently of itself.
"""

import json
from pathlib import Path

import numpy as np
import pytest

from skyshift.domain.fits_bytes import (
    decode_compressed_rows,
    decode_float_rows,
    find_header_end,
    hdu_info,
    heap_range,
    image_meta,
    local_wavelength,
    row_descriptor_range,
)

L2 = Path(__file__).parent / "fixtures" / "l2"
LAYOUT = {h["name"]: h for h in json.loads((L2 / "l2-layout.json").read_text())["hdus"]}
HEAD = (L2 / "l2-head.bin").read_bytes()
EPS_INDI_B_2026 = (331.0912, -56.7975)


def test_header_end_found_only_with_complete_header():
    assert find_header_end(HEAD[:2880]) == 2880  # PRIMARY
    assert find_header_end(HEAD[2880 : 2880 + 2880 * 3]) is None  # IMAGE header is longer
    assert find_header_end(HEAD[2880:]) == 25920 - 2880


def test_image_hdu_layout_matches_full_file_walk():
    info = hdu_info(HEAD[2880:], header_start=2880)
    assert info.name == "IMAGE"
    assert info.data_start == LAYOUT["IMAGE"]["data_start"]
    assert info.data_len == LAYOUT["IMAGE"]["data_len"]
    assert info.next_header_start == LAYOUT["FLAGS"]["header_start"]
    assert not info.compressed


def test_flags_hdu_is_rice_compressed_per_row():
    flags = hdu_info((L2 / "l2-flags-header.bin").read_bytes(), LAYOUT["FLAGS"]["header_start"])
    assert flags.compressed
    assert flags.data_len == LAYOUT["FLAGS"]["data_len"]
    assert flags.next_header_start == LAYOUT["VARIANCE"]["header_start"]


def test_partial_rice_decode_equals_full_astropy_decode():
    header = (L2 / "l2-flags-header.bin").read_bytes()
    flags = hdu_info(header, LAYOUT["FLAGS"]["header_start"])
    start, length = row_descriptor_range(flags, y0=1650, rows=3)
    descriptors = (L2 / "l2-flags-descriptors.bin").read_bytes()
    rel = start - flags.data_start
    rows_desc = descriptors[rel : rel + length]
    h_start, h_len = heap_range(flags, rows_desc)
    heap = (L2 / "l2-flags-heap-1650-1652.bin").read_bytes()
    assert h_len == len(heap)
    assert h_start > flags.data_start
    decoded = decode_compressed_rows(header, rows_desc, heap)
    truth = np.load(L2 / "l2-flags-truth-1650-1652.npy")
    np.testing.assert_array_equal(decoded, truth)


def test_float_rows_decode_big_endian():
    raw = (L2 / "l2-image-1650-1652.bin").read_bytes()
    rows = decode_float_rows(raw, width=2040)
    assert rows.shape == (3, 2040)
    assert rows.dtype == np.float32
    assert 0.0 < float(np.nanmedian(rows)) < 50.0  # MJy/sr, plausible sky level


def test_image_meta_reads_quality_time_and_geometry():
    meta = image_meta(HEAD[2880:])
    assert meta.detector == 3
    assert meta.mjd_avg == pytest.approx(61305.229064534)
    assert meta.survey_epa_deg == 180
    assert meta.finast == 0
    assert meta.l2dqa_pass is True
    assert (meta.naxis1, meta.naxis2) == (2040, 2040)


def test_local_wavelength_uses_spatial_sip_and_spectral_without_sip():
    wave_hdu = (L2 / "l2-wcswave.bin").read_bytes()
    lam = local_wavelength(HEAD[2880:], wave_hdu, *EPS_INDI_B_2026)
    assert 1.6 < lam.wavelength_um < 2.45  # D3 range (D12 §1)
    assert 0.0 < lam.bandwidth_um < 0.1
    assert lam.x == pytest.approx(2002.1, abs=0.2)  # measured in the S3 spike
    assert lam.y == pytest.approx(1668.2, abs=0.2)
    assert lam.sip_effect_nm > 0  # D12 §0.4: keeping SIP on the W axis would bias λ
