# pyright: basic
# Reason: jsonschema's validator methods are only partially typed.
"""Spec 0010 §0 / plan 0011 tasks 11-12: outcome rules and contract, on SYNTHETIC rows only."""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from skyshift.api.analysis_json import analysis_result_json
from skyshift.application.list_observations import ObservationIndex
from skyshift.application.measure_target import (
    ExposureMeasurement,
    MeasureRequest,
    _conclude,  # pyright: ignore[reportPrivateUsage]
    flag_names,
)
from skyshift.application.tiered_cache import CacheLayer
from skyshift.domain.astro import julian_year
from skyshift.domain.measurement.astrometry import tangent_offset_arcsec
from skyshift.domain.measurement.criteria import MeasurementCriteria, Threshold
from skyshift.domain.motion import Motion
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[2] / "contracts" / "analysis-result.schema.json").read_text(
        encoding="utf-8"
    )
)
REF = SkyPosition(331.0, -56.8)
CRITERIA = MeasurementCriteria(
    reference="TEST values (synthetic fixtures only)",
    min_snr_per_exposure=Threshold(5.0, "test"),
    min_significance_sigma_two_sided=Threshold(5.0, "test"),
    sigma_wcs_arcsec_per_axis=Threshold(0.3, "test"),
    flag_radius_px=Threshold(2.5, "test"),
)


def request(motion: Motion | None = None) -> MeasureRequest:
    return MeasureRequest(
        label="synthetic target",
        position=REF,
        position_source="synthetic",
        motion=motion,
        motion_source="synthetic catalog" if motion else None,
        detector=3,
        criteria=CRITERIA,
    )


def index() -> ObservationIndex:
    return ObservationIndex(
        REF, (), (), datetime(2026, 11, 14, tzinfo=UTC), CacheLayer.LOCAL, False
    )


def obs(i: int, mjd: float) -> Observation:
    return Observation(
        f"synthetic/{i}/D3",
        f"synthetic_{i}",
        "spherex_dr1",
        3,
        mjd,
        mjd + 0.001,
        "https://example.invalid/x.fits",
        None,
    )


def row(
    i: int,
    mjd: float,
    visit: str,
    offset: tuple[float, float],
    *,
    used: bool = True,
    reason: str | None = None,
    bits: int = 0,
) -> ExposureMeasurement:
    # Place the star `offset` arcsec (RA·cosδ, Dec) from REF using the inverse small-angle step.
    import math

    dec = REF.dec_deg + offset[1] / 3600
    ra = REF.ra_deg + offset[0] / 3600 / math.cos(math.radians(REF.dec_deg))
    xi, eta = tangent_offset_arcsec(ra, dec, REF.ra_deg, REF.dec_deg)
    assert abs(xi - offset[0]) < 1e-3
    assert abs(eta - offset[1]) < 1e-3
    return ExposureMeasurement(
        obs(i, mjd),
        visit,
        mjd,
        100.0,
        100.0,
        ra,
        dec,
        ((0.09, 0.0), (0.0, 0.09)) if used else None,
        50.0 if used else None,
        1.2,
        bits,
        used,
        reason,
    )


def moving_rows(pm: tuple[float, float]) -> tuple[ExposureMeasurement, ...]:
    rows: list[ExposureMeasurement] = []
    for k, (mjd, visit) in enumerate(
        [(60800, "va"), (60805, "va"), (61000, "vb"), (61005, "vb"), (61200, "vc")]
    ):
        dt = julian_year(mjd) - 2025.5
        rows.append(row(k, mjd, visit, (pm[0] * dt, pm[1] * dt)))
    return tuple(rows)


def test_fast_mover_exceeds_threshold_but_is_never_change_measured():
    m = _conclude(request(), index(), moving_rows((4.0, -2.5)))
    assert m.test is not None
    assert m.test.statistic > CRITERIA.q_threshold_2dof
    assert m.outcome == "threshold_exceeded_unverified"  # A4: assumptions not verified
    codes = {i.code for i in m.issues}
    assert {
        "registration_unverified",
        "wavelength_dependent_position",
        "assumptions_unverified",
    } <= codes


def test_static_source_is_below_criterion_not_motionless():
    m = _conclude(request(), index(), moving_rows((0.0, 0.0)))
    assert m.outcome == "change_below_criterion"
    assert m.fit is not None
    assert abs(m.fit.pm_xi_arcsec_yr) < 1e-6


def test_t11_one_visit_is_not_two_epochs():
    rows = (row(0, 60800, "va", (0, 0)), row(1, 60810, "va", (1, 1)))
    m = _conclude(request(), index(), rows)
    assert m.outcome == "not_evaluable"
    assert any(i.code == "insufficient_epochs" for i in m.issues)


def test_t6_flagged_exposures_are_excluded_with_reason():
    rows = (
        *moving_rows((4.0, -2.5)),
        row(9, 61210, "vc", (0, 0), used=False, reason="bad_pixels_near_target", bits=1 << 10),
    )
    m = _conclude(request(), index(), rows)
    blocked = [i for i in m.issues if i.code == "bad_pixels_near_target"]
    assert len(blocked) == 1
    assert blocked[0].observation_id == "synthetic/9/D3"
    assert flag_names(1 << 10) == ["HOT"]


def test_no_usable_exposure_is_no_usable_detection():
    rows = (row(0, 60800, "va", (0, 0), used=False, reason="low_snr"),)
    assert _conclude(request(), index(), rows).outcome == "no_usable_detection"


def test_parallax_missing_is_reported():
    m = _conclude(request(None), index(), moving_rows((4.0, -2.5)))
    assert any(i.code == "parallax_not_modeled" for i in m.issues)
    m2 = _conclude(
        request(Motion(4000.0, -2500.0, 270.0, 2016.0)), index(), moving_rows((4.0, -2.5))
    )
    assert not any(i.code == "parallax_not_modeled" for i in m2.issues)


@pytest.mark.parametrize("pm", [(4.0, -2.5), (0.0, 0.0)])
def test_serialized_result_validates_against_handwritten_schema(pm: tuple[float, float]):
    m = _conclude(request(Motion(4000.0, -2500.0, 270.0, 2016.0)), index(), moving_rows(pm))
    doc = analysis_result_json(
        m,
        analysis_id="synthetic-motion",
        code_ref=None,
        is_synthetic=True,
        now=datetime(2026, 11, 14, 23, 0, tzinfo=UTC),
    )
    errors = [e.message for e in Draft202012Validator(SCHEMA).iter_errors(doc)]
    assert errors == []
    assert doc["interpretation_ceiling"] == "OBSERVED"
    assert doc["photometry"] is None
    assert any(i["code"] == "synthetic_data" for i in doc["issues"])


def test_schema_rejects_evaluated_or_photometry():
    m = _conclude(request(), index(), moving_rows((4.0, -2.5)))
    doc = analysis_result_json(m, analysis_id="synthetic-x", code_ref=None, is_synthetic=True)
    v = Draft202012Validator(SCHEMA)
    assert not v.is_valid({**doc, "interpretation_ceiling": "EVALUATED"})
    assert not v.is_valid({**doc, "photometry": {"flux": 1}})
    assert not v.is_valid({**doc, "outcome": "confirmed"})
