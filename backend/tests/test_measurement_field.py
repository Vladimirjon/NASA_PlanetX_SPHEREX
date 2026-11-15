# pyright: basic
# Reason: jsonschema's validator methods are only partially typed.
"""Field-star controls (Sebastián, spec 0034 §1; spec 0010 C3, C6) on SYNTHETIC data only."""

import json
import math
from datetime import UTC, datetime
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from skyshift.adapters.irsa_gaia import parse_ipac_gaia
from skyshift.api.analysis_json import analysis_result_json
from skyshift.api.checklist_evidence import checklist_evidence
from skyshift.application.list_observations import ObservationIndex
from skyshift.application.measure_target import (
    ExposureMeasurement,
    FieldCatalog,
    FieldControls,
    MeasureRequest,
    _conclude,  # pyright: ignore[reportPrivateUsage]
    pair_displacement,
)
from skyshift.application.tiered_cache import CacheLayer
from skyshift.domain.astro import julian_year
from skyshift.domain.measurement.astrometry import tangent_offset_arcsec
from skyshift.domain.measurement.criteria import MeasurementCriteria, Threshold
from skyshift.domain.measurement.registration import (
    CatalogStar,
    ReferenceSelection,
    identify_target,
    neighbors,
    registration_stats,
    select_references,
    wavelength_slope,
)
from skyshift.domain.motion import Motion
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import InvalidPayload

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[2] / "contracts" / "analysis-result.schema.json").read_text(
        encoding="utf-8"
    )
)
REF = SkyPosition(331.0, -56.8)
RULE = ReferenceSelection(11.0, 17.5, 1.4, 30.0, 12.3, 3.0, 15)
FIELD = FieldControls(240.0, RULE, 18.45, 6.15)
CRITERIA = MeasurementCriteria(
    reference="TEST values (synthetic fixtures only)",
    min_snr_per_exposure=Threshold(5.0, "test"),
    min_significance_sigma_two_sided=Threshold(5.0, "test"),
    sigma_wcs_arcsec_per_axis=Threshold(0.3, "test"),
    flag_radius_px=Threshold(2.5, "test"),
)

IPAC = rb"""\fixlen = T
\RowsRetrieved = 3
| source_id| ra| dec| pmra| pmdec| parallax| phot_g_mean_mag| ruwe| ref_epoch| dist|
| long| double| double| double| double| double| double| double| double| double|
| | deg| deg| mas/yr| mas/yr| mas| mag| | yr| arcsec|
| null| null| null| null| null| null| null| null| null| null|
 1000000000001 331.00000 -56.80000 3981.0 -2466.0 270.66 18.03 4.30 2016.000 0.0
 1000000000002 331.02000 -56.79000 -3.5 0.8 1.18 14.50 1.04 2016.000 45.0
 1000000000003 331.02010 -56.79010 null null null 19.90 null 2016.000 45.3
"""


def star(sid: str, ra: float, dec: float, g: float, ruwe: float = 1.0) -> CatalogStar:
    return CatalogStar(sid, ra, dec, 2016.0, 0.0, 0.0, 1.0, g, ruwe)


def test_gaia_ipac_table_is_parsed_with_nulls():
    stars = parse_ipac_gaia(IPAC)
    assert [s.source_id for s in stars] == ["1000000000001", "1000000000002", "1000000000003"]
    assert stars[0].motion is not None
    assert stars[0].motion.parallax_mas == pytest.approx(270.66)
    assert stars[2].motion is None
    assert stars[2].ruwe is None


def test_gaia_error_page_is_rejected():
    with pytest.raises(InvalidPayload):
        parse_ipac_gaia(b'<html>[struct stat="ERROR"] service down</html>')


def test_target_identified_and_excluded_from_references():
    stars = [
        star("target", 331.0, -56.8, 18.0, ruwe=4.3),
        star("good", 331.02, -56.79, 14.5),
        star("too_bright", 331.03, -56.79, 9.0),
        star("bad_ruwe", 331.04, -56.79, 14.0, ruwe=3.0),
        star("crowded", 331.05, -56.79, 15.0),
        star("crowder", 331.0502, -56.79, 15.5),  # 4 arcsec away and similar brightness
        star("too_close", 331.004, -56.8, 14.0),  # 8.6 arcsec from the target
    ]
    target = identify_target(stars, REF)
    assert target is not None
    assert target.source_id == "target"
    chosen = {s.source_id for s in select_references(stars, target, 61000.0, RULE)}
    assert chosen == {"good"}


def test_neighbors_within_radius_at_used_epochs():
    stars = [star("target", 331.0, -56.8, 18.0), star("near", 331.0, -56.797, 19.3)]
    found = neighbors(stars, stars[0], [REF], [61000.0], 18.45)
    assert [n.source_id for n in found] == ["near"]
    assert found[0].min_separation_arcsec == pytest.approx(10.8, abs=0.2)
    assert neighbors(stars, stars[0], [REF], [61000.0], 5.0) == []


def test_registration_uses_scatter_of_per_exposure_means():
    per = {
        "e1": [("s1", 0.10, 0.0), ("s2", 0.12, 0.02)],
        "e2": [("s1", -0.10, 0.0), ("s2", -0.08, -0.02)],
        "e3": [("s1", 0.0, 0.0)],  # one star only: ignored
    }
    stats = registration_stats(per)
    assert stats is not None
    assert stats.n_exposures == 2
    # per-exposure means 0.11 and -0.09 -> sample std = 0.20 / sqrt(2)
    assert stats.rms_xi_arcsec == pytest.approx(0.20 / math.sqrt(2), rel=1e-6)
    assert registration_stats({"e1": per["e1"]}) is None


def test_wavelength_slope_detects_color_shift_and_not_noise():
    lam = [1.65, 1.8, 1.95, 2.1, 2.25, 2.4]
    shifted = [(0.5 * (x - 2.0), 0.0) for x in lam]  # photocenter moves with colour
    sig = [(0.05, 0.05)] * len(lam)
    s = wavelength_slope(lam, shifted, sig)
    assert s is not None
    assert s.slope_xi_arcsec_per_um == pytest.approx(0.5, abs=1e-9)
    assert abs(s.slope_eta_arcsec_per_um) < 1e-9
    assert wavelength_slope([2.0, 2.0, 2.0], shifted[:3], sig[:3]) is None


def obs(i: int, mjd: float) -> Observation:
    return Observation(
        f"synthetic/{i}/D3", f"synthetic_{i}", "spherex_dr1", 3, mjd, mjd + 0.001,
        "https://example.invalid/x.fits", None,
    )  # fmt: skip


def row(
    i: int,
    mjd: float,
    visit: str,
    offset: tuple[float, float],
    refs: tuple[tuple[str, float, float], ...],
    lam: float,
) -> ExposureMeasurement:
    dec = REF.dec_deg + offset[1] / 3600
    ra = REF.ra_deg + offset[0] / 3600 / math.cos(math.radians(REF.dec_deg))
    return ExposureMeasurement(
        obs(i, mjd), visit, mjd, 100.0, 100.0, ra, dec, ((0.0004, 0.0), (0.0, 0.0004)),
        80.0, 1.2, 0, True, None, lam, refs,
    )  # fmt: skip


def moving(ref_noise: float) -> tuple[ExposureMeasurement, ...]:
    out: list[ExposureMeasurement] = []
    plan = [
        (60800, "va"),
        (60806, "va"),
        (61000, "vb"),
        (61006, "vb"),
        (61200, "vc"),
        (61206, "vc"),
    ]
    for k, (mjd, visit) in enumerate(plan):
        dt = julian_year(mjd) - 2025.5
        sign = 1 if k % 2 else -1
        refs = (("s1", sign * ref_noise, 0.0), ("s2", sign * ref_noise, 0.0))
        out.append(row(k, mjd, visit, (4.0 * dt, -2.5 * dt), refs, 1.65 + 0.1 * k))
    return tuple(out)


def request() -> MeasureRequest:
    return MeasureRequest(
        "synthetic target", REF, "synthetic", Motion(4000.0, -2500.0, 0.0, 2016.0),
        "synthetic catalog", 3, CRITERIA, FIELD,
    )  # fmt: skip


def index() -> ObservationIndex:
    return ObservationIndex(
        REF, (), (), datetime(2026, 11, 14, tzinfo=UTC), CacheLayer.LOCAL, False
    )


def field() -> FieldCatalog:
    t = star("target", REF.ra_deg, REF.dec_deg, 18.0)
    return FieldCatalog("synthetic catalog", t, (star("s1", 331.02, -56.79, 14.0),), (t,))


def test_small_field_scatter_keeps_the_provisional_floor():
    m = _conclude(request(), index(), moving(0.05), field())
    assert m.applied_sigma_arcsec == (0.3, 0.3)
    assert any(i.code == "registration_checked" for i in m.issues)
    assert not any(i.code == "registration_unverified" for i in m.issues)


def test_large_field_scatter_inflates_the_wcs_term():
    m = _conclude(request(), index(), moving(0.6), field())
    assert m.applied_sigma_arcsec[0] > 0.6
    assert any(i.code == "uncertainty_inflated" for i in m.issues)
    used = [r for r in m.measurements if r.used]
    assert used[0].cov_pos is not None
    assert used[0].cov_pos[0][0] == pytest.approx(0.0004 + m.applied_sigma_arcsec[0] ** 2)


def test_still_a_candidate_with_every_control_present():
    m = _conclude(request(), index(), moving(0.05), field())
    assert m.outcome == "threshold_exceeded_unverified"
    assert m.wavelength is not None
    assert len(m.sensitivity) == 1 + 3  # without OUTLIER + leave-one-visit-out x3


def test_pair_displacement_adds_both_covariances():
    m = _conclude(request(), index(), moving(0.05), field())
    a, b = m.measurements[0], m.measurements[-1]
    pair = pair_displacement(m.request, a, b)
    assert a.cov_pos is not None
    assert b.cov_pos is not None
    assert pair.cov[0][0] == pytest.approx(a.cov_pos[0][0] + b.cov_pos[0][0])
    xi_a, _ = tangent_offset_arcsec(a.ra_deg or 0, a.dec_deg or 0, REF.ra_deg, REF.dec_deg)
    xi_b, _ = tangent_offset_arcsec(b.ra_deg or 0, b.dec_deg or 0, REF.ra_deg, REF.dec_deg)
    assert pair.delta_xi_arcsec == pytest.approx(xi_b - xi_a)


def test_checklist_evidence_matches_sebastians_pair_format():
    m = _conclude(request(), index(), moving(0.05), field())
    doc = checklist_evidence(
        m, ("synthetic_0", "synthetic_5"), result_ref="result.json", code_ref=None
    )
    assert doc["stage"] == "preselection"
    assert len(doc["observations"]) == 2
    for record in doc["observations"]:
        assert {"product_id", "acquisition_id", "identity_status", "midpoint_utc"} <= set(record)
        assert record["midpoint_utc"].endswith("Z")
    assert doc["checks"]["alignment"]["status"] == "unknown"  # science decides acceptability
    assert doc["checks"]["centroid_color_bias"]["status"] == "unknown"
    assert all(c["evidence_refs"] for c in doc["checks"].values())
    missing = checklist_evidence(m, ("nope", "synthetic_5"), result_ref="r", code_ref=None)
    assert "error" in missing


def test_result_with_field_controls_validates_against_schema():
    m = _conclude(request(), index(), moving(0.05), field())
    doc = analysis_result_json(
        m, analysis_id="synthetic-field", code_ref=None, is_synthetic=True,
        now=datetime(2026, 11, 14, 23, 0, tzinfo=UTC),
    )  # fmt: skip
    errors = [e.message for e in Draft202012Validator(SCHEMA).iter_errors(doc)]
    assert errors == []
    assert doc["astrometry"]["reference_star_check"]["n_exposures"] == 6
    assert doc["field_sources"]["target_source_id"] == "target"
