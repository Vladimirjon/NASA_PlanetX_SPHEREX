import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from skyshift.domain.hips import HipsTileAddress, InvalidTileAddress
from skyshift.domain.position import InvalidPosition, SkyPosition


class TestSkyPosition:
    @given(
        ra=st.floats(min_value=0, max_value=360, exclude_max=True),
        dec=st.floats(min_value=-90, max_value=90),
    )
    def test_accepts_every_valid_coordinate(self, ra: float, dec: float):
        pos = SkyPosition(ra, dec)
        assert (pos.ra_deg, pos.dec_deg) == (ra, dec)

    @pytest.mark.parametrize(
        ("ra", "dec"),
        [
            (360.0, 0.0),
            (-0.001, 0.0),
            (0.0, 90.0001),
            (0.0, -90.0001),
            (math.nan, 0.0),
            (0.0, math.inf),
        ],
    )
    def test_rejects_out_of_range_or_non_finite(self, ra: float, dec: float):
        with pytest.raises(InvalidPosition):
            SkyPosition(ra, dec)


class TestHipsTileAddress:
    def test_dir_follows_hips_standard(self):
        assert HipsTileAddress(order=5, npix=12287, plane=0).dir == 10000
        assert HipsTileAddress(order=5, npix=9999, plane=0).dir == 0

    def test_tile_name_matches_irsa_cube_layout(self):
        # Plane 0 has no suffix; others use _<plane> (IRSA SPHEREx HiPS cube).
        assert HipsTileAddress(order=3, npix=10, plane=0).path == "Norder3/Dir0/Npix10.png"
        assert HipsTileAddress(order=3, npix=10, plane=19).path == "Norder3/Dir0/Npix10_19.png"

    @pytest.mark.parametrize(
        ("order", "npix", "plane"),
        [(-1, 0, 0), (6, 0, 0), (0, 12, 0), (5, 12288, 0), (0, 0, 102), (0, 0, -1)],
    )
    def test_rejects_invalid(self, order: int, npix: int, plane: int):
        with pytest.raises(InvalidTileAddress):
            HipsTileAddress(order=order, npix=npix, plane=plane)

    def test_from_path_rejects_inconsistent_dir(self):
        with pytest.raises(InvalidTileAddress):
            HipsTileAddress.from_path(order=5, dir_=0, npix=12000, plane=0)
        assert HipsTileAddress.from_path(order=5, dir_=10000, npix=12000, plane=1).npix == 12000


def test_challenge_targets_resolve_by_common_aliases():
    from skyshift.domain.targets import find_known

    assert find_known("WISE 0855" + chr(0x2212) + "0714") is not None  # Unicode minus
    assert find_known("  barnard's   STAR ") is not None
    assert find_known("R_Dra") is not None
    assert find_known("Planet Nine") is None
