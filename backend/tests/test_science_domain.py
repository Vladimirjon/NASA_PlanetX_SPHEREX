"""Science rules from docs/context/12-mapa-de-datos-spherex.md (D12), using D12 numbers."""

import itertools

import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st

from skyshift.domain.comparability import Check, interpretation_level
from skyshift.domain.flags import COMPARE_MASK, OUTLIER_BIT, comparison_mask
from skyshift.domain.motion import Motion, propagate
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.domain.visits import group_into_visits
from skyshift.domain.wavelength import Candidate, select_series, tolerance_nm


def obs(t: float, det: int = 1, n: int = 0) -> Observation:
    return Observation(
        obs_did=f"ivo://irsa.ipac/spherex_dr1?X{t}_{n}/D{det}",
        obs_id=f"X{t}_{n}",
        collection="spherex_dr1",
        detector=det,
        t_min_mjd=t,
        t_max_mjd=t + 0.0013,
        access_url="https://irsa.ipac.caltech.edu/ibe/data/spherex/x.fits",
        s3_key=None,
    )


class TestVisits:
    def test_gap_over_45_days_starts_new_visit(self):
        # D12 §5.2: max intra-visit gap 26.9 d, min inter-visit gap 87.0 d.
        times = [60800.0, 60810.0, 60826.9, 60913.9, 60920.0]
        visits = group_into_visits([obs(t) for t in reversed(times)])
        assert [len(v.observations) for v in visits] == [3, 2]
        assert visits[0].start_mjd == 60800.0
        assert visits[1].start_mjd == 60913.9

    def test_long_visit_is_flagged(self):
        visits = group_into_visits([obs(60000.0 + 30 * i) for i in range(5)])  # 120 d chain
        assert len(visits) == 1
        assert visits[0].long_visit is True

    def test_empty(self):
        assert group_into_visits([]) == []

    @given(st.lists(st.floats(min_value=60000, max_value=62000), min_size=1, max_size=60))
    def test_every_observation_lands_in_exactly_one_visit(self, times: list[float]):
        visits = group_into_visits([obs(t, n=i) for i, t in enumerate(times)])
        assert sum(len(v.observations) for v in visits) == len(times)
        for a, b in itertools.pairwise(visits):
            assert b.start_mjd - a.end_mjd > 45


class TestWavelength:
    @pytest.mark.parametrize(
        ("lam_um", "det", "expected_nm"),
        [(0.97, 1, 6.2), (3.07, 4, 21.9), (4.37, 6, 8.5)],  # D12 §6.6 (R 39/41/41/35/112/128)
    )
    def test_tolerance_is_lambda_over_4r(self, lam_um: float, det: int, expected_nm: float):
        assert tolerance_nm(lam_um, det) == pytest.approx(expected_nm, abs=0.1)

    def test_picks_reference_that_keeps_most_visits_then_min_delta(self):
        visits = group_into_visits([obs(60000.0), obs(60001.0, n=1), obs(60180.0), obs(60360.0)])
        cand = {
            visits[0].visit_id: [
                Candidate(visits[0].observations[0], 0.980),
                Candidate(visits[0].observations[1], 0.900),
            ],
            visits[1].visit_id: [Candidate(visits[1].observations[0], 0.902)],
            visits[2].visit_id: [Candidate(visits[2].observations[0], 0.899)],
        }
        sel = select_series(visits, cand, detector=1)
        assert [round(c.wavelength_um, 3) for c in sel.chosen] == [0.900, 0.902, 0.899]
        assert sel.rejected == ()

    def test_visit_without_compatible_wavelength_is_rejected_with_numbers(self):
        visits = group_into_visits([obs(60000.0), obs(60180.0)])
        cand = {
            visits[0].visit_id: [Candidate(visits[0].observations[0], 0.994)],
            visits[1].visit_id: [
                Candidate(visits[1].observations[0], 0.861)
            ],  # demo pair, D12 §0.2
        }
        sel = select_series(visits, cand, detector=1, reference_um=0.994)
        assert len(sel.chosen) == 1
        assert sel.rejected[0].reason == "wavelength_mismatch"
        assert "nm" in sel.rejected[0].detail

    def test_requested_wavelength_is_honoured(self):
        visits = group_into_visits([obs(60000.0), obs(60001.0, n=1)])
        cand = {
            visits[0].visit_id: [
                Candidate(visits[0].observations[0], 1.10),
                Candidate(visits[0].observations[1], 1.20),
            ]
        }
        sel = select_series(visits, cand, detector=2, reference_um=1.198)
        assert sel.chosen[0].wavelength_um == 1.20


class TestFlags:
    def test_mask_value_matches_d12(self):
        assert COMPARE_MASK == 0x3FD2CEC7

    def test_source_and_outlier_are_not_masked_but_outlier_reported(self):
        flags = np.array([[1 << 21, 1 << 19, 1 << 1, 0]], dtype=np.int32)
        masked, outlier = comparison_mask(flags)
        assert masked.tolist() == [[False, False, True, False]]
        assert outlier.tolist() == [[False, True, False, False]]
        assert OUTLIER_BIT == 19

    def test_int32_high_bits_do_not_overflow(self):
        flags = np.array([np.int32(-(2**31))], dtype=np.int32)  # bit 31 set
        masked, _ = comparison_mask(flags)
        assert masked.tolist() == [False]


class TestComparability:
    def test_evaluated_only_if_every_check_passes(self):
        ok = [Check("same_detector", True, ""), Check("wavelength_within_tolerance", True, "")]
        assert interpretation_level(ok) == "EVALUATED"
        assert (
            interpretation_level([*ok, Check("flags_clear_at_target", False, "bit 1")])
            == "OBSERVED"
        )
        assert interpretation_level([]) == "OBSERVED"


class TestMotion:
    # D12 §7 Gaia DR3 / Luhman & Esplin 2016 values; expected displacements measured in D12.
    BARNARD = (SkyPosition(269.44850253, 4.73942005), Motion(-801.551, 10362.394, 546.976, 2016.0))
    WISE0855 = (SkyPosition(133.7952573, -7.2450910), Motion(-8118.0, 680.0, 449.0, 2010.34))

    @staticmethod
    def sep_arcsec(a: SkyPosition, b: SkyPosition) -> float:
        dra = (a.ra_deg - b.ra_deg) * np.cos(np.radians(a.dec_deg))
        return float(np.hypot(dra, a.dec_deg - b.dec_deg) * 3600)

    def test_barnard_one_year_matches_d12(self):
        pos, motion = self.BARNARD
        a = propagate(pos, motion, mjd=60914.0)  # 2025-08-27
        b = propagate(pos, motion, mjd=61273.0)  # 2026-08-21
        assert self.sep_arcsec(a, b) == pytest.approx(10.24, abs=0.15)

    def test_wise0855_one_year_and_half_year_with_parallax(self):
        pos, motion = self.WISE0855
        may25 = propagate(pos, motion, mjd=60801.0)  # 2025-05-06
        nov25 = propagate(pos, motion, mjd=60986.0)  # 2025-11-07
        may26 = propagate(pos, motion, mjd=61162.0)  # 2026-05-02
        assert self.sep_arcsec(may25, may26) == pytest.approx(8.05, abs=0.15)
        assert self.sep_arcsec(may25, nov25) == pytest.approx(3.26, abs=0.25)  # parallax matters

    def test_wise0855_has_moved_about_125_arcsec_west_since_2010(self):
        pos, motion = self.WISE0855
        now = propagate(pos, motion, mjd=60801.0)
        assert now.ra_deg < pos.ra_deg
        assert self.sep_arcsec(pos, now) == pytest.approx(125, abs=6)

    def test_no_motion_is_identity(self):
        pos = SkyPosition(10.0, 20.0)
        assert propagate(pos, None, mjd=61000.0) == pos
