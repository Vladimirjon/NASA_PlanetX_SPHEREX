import json
import math
import unittest
from pathlib import Path

from science.preview import build_report
from science.validation import (
    aggregate_checks,
    astrometric_p_value,
    check_flags,
    check_observation_identity,
    check_signal_to_noise,
    compare_significance,
    flux_difference,
    spectral_check,
)


class SpectralCheckTests(unittest.TestCase):
    def test_candidate_pair_passes_only_the_numeric_filter(self):
        result = spectral_check(
            1.934120774, 1.933309913, 0.046931170, 0.047647767, 0.02
        )
        self.assertEqual(result.status, "pass")
        self.assertAlmostEqual(result.value, 0.01727766429)
        self.assertIn("not establish", result.reason)

    def test_missing_or_invalid_bandwidth_cannot_pass(self):
        for bandwidth in (None, 0.0, -1.0, math.nan, math.inf):
            with self.subTest(bandwidth=bandwidth):
                result = spectral_check(1.9, 1.9, bandwidth, 0.05, 0.02)
                self.assertEqual(result.status, "unknown")

    def test_explicit_threshold_is_required(self):
        result = spectral_check(1.9, 1.9, 0.05, 0.05, None)
        self.assertEqual(result.status, "unknown")

    def test_non_numeric_boolean_or_unrepresentable_values_are_unknown(self):
        for value in (True, "1.9", 10**500):
            with self.subTest(value=value):
                self.assertEqual(
                    spectral_check(value, 1.9, 0.05, 0.05, 0.02).status, "unknown"
                )

    def test_exact_match_can_use_zero_tolerance(self):
        self.assertEqual(spectral_check(1.9, 1.9, 0.05, 0.05, 0.0).status, "pass")
        self.assertEqual(spectral_check(1.9, 1.91, 0.05, 0.05, 0.0).status, "fail")

    def test_spectral_mismatch_fails_the_filter(self):
        result = spectral_check(1.6, 2.3, 0.04, 0.05, 0.02)
        self.assertEqual(result.status, "fail")


class AggregationTests(unittest.TestCase):
    def test_unknown_check_prevents_eligibility(self):
        self.assertEqual(
            aggregate_checks({"identity": "pass", "target": "unknown"}), "pending"
        )

    def test_failure_prevents_eligibility(self):
        self.assertEqual(
            aggregate_checks({"target": "unknown", "time": "fail"}), "rejected"
        )

    def test_empty_checks_never_pass(self):
        self.assertEqual(aggregate_checks({}), "pending")

    def test_preselection_never_authorizes_measurement(self):
        self.assertEqual(
            aggregate_checks({"identity": "pass"}, stage="preselection"), "pending"
        )

    def test_incomplete_prepared_checks_never_authorize_measurement(self):
        self.assertEqual(
            aggregate_checks({"identity": "pass"}, stage="prepared"), "pending"
        )

    def test_fully_evidenced_prepared_checks_are_eligible(self):
        checks = {
            name: "pass"
            for name in (
                "identity",
                "time",
                "target",
                "coverage",
                "alignment",
                "quality",
                "uncertainty",
                "spectral_compatibility",
                "method",
            )
        }
        self.assertEqual(
            aggregate_checks(checks, stage="prepared"), "eligible_for_method"
        )


class ObservationIdentityTests(unittest.TestCase):
    def setUp(self):
        self.a = {
            "product_id": "A",
            "acquisition_id": "obs-a",
            "identity_status": "resolved",
            "midpoint_utc": "2025-05-05T16:49:00.018Z",
        }
        self.b = {
            "product_id": "B",
            "acquisition_id": "obs-b",
            "identity_status": "resolved",
            "midpoint_utc": "2026-05-11T02:19:42.221Z",
        }

    def test_distinct_observations_with_utc_pass(self):
        self.assertEqual(check_observation_identity(self.a, self.b).status, "pass")

    def test_duplicate_acquisition_is_rejected(self):
        self.b["acquisition_id"] = "obs-a"
        self.assertEqual(check_observation_identity(self.a, self.b).status, "fail")

    def test_missing_utc_or_unresolved_identity_is_unknown(self):
        self.b["midpoint_utc"] = "2026-05-11T02:19:42"
        self.assertEqual(check_observation_identity(self.a, self.b).status, "unknown")
        self.b["identity_status"] = "unresolved"
        self.assertEqual(check_observation_identity(self.a, self.b).status, "unknown")


class AstrometryTests(unittest.TestCase):
    def test_correlated_covariance_uses_full_two_dimensional_test(self):
        result = astrometric_p_value((1.0, 1.0), ((1.0, 0.8), (0.8, 1.0)))
        self.assertAlmostEqual(result.statistic, 1.1111111111)
        self.assertAlmostEqual(result.p_value, math.exp(-1.1111111111 / 2))

    def test_singular_covariance_is_unknown(self):
        self.assertIsNone(astrometric_p_value((1.0, 1.0), ((1.0, 1.0), (1.0, 1.0))))

    def test_5sigma_requires_two_dimensional_probability_not_q_equals_25(self):
        below = math.exp(-25 / 2)
        above = math.exp(-29 / 2)
        self.assertEqual(compare_significance(below, 5.0, 1), "below_threshold")
        self.assertEqual(compare_significance(above, 5.0, 1), "above_threshold")

    def test_significance_requires_explicit_number_of_trials(self):
        self.assertEqual(compare_significance(1e-9, 5.0, None), "unknown")
        self.assertEqual(compare_significance(1e-9, 5.0, 1000), "below_threshold")


class MeasurementChecksTests(unittest.TestCase):
    def test_detection_needs_an_explicit_threshold(self):
        self.assertEqual(check_signal_to_noise(4.7, 5.0).status, "fail")
        self.assertEqual(check_signal_to_noise(5.0, 5.0).status, "pass")
        self.assertEqual(check_signal_to_noise(5.0, None).status, "unknown")

    def test_flags_use_the_supplied_method_policy(self):
        policy = {"blocked": {"HOT"}, "warning": {"TRANSIENT"}, "neutral": {"SOURCE"}}
        self.assertEqual(check_flags({"SOURCE"}, policy).status, "pass")
        self.assertEqual(check_flags({"HOT"}, policy).status, "fail")
        self.assertEqual(check_flags({"TRANSIENT"}, policy).status, "warning")
        self.assertEqual(check_flags({"UNRECOGNIZED"}, policy).status, "unknown")

    def test_flux_difference_includes_cross_epoch_covariance(self):
        result = flux_difference(10.0, 13.0, 2.0, 3.0, 1.0)
        self.assertAlmostEqual(result.difference, 3.0)
        self.assertAlmostEqual(result.uncertainty, math.sqrt(11.0))

    def test_flux_difference_never_assumes_missing_covariance(self):
        self.assertIsNone(flux_difference(10.0, 13.0, 2.0, 3.0, None))


class PreviewReportTests(unittest.TestCase):
    def test_prefilter_pass_does_not_replace_missing_quality_evidence(self):
        item = {
            "stage": "preselection",
            "observations": [
                {
                    "product_id": "A",
                    "acquisition_id": "a",
                    "identity_status": "resolved",
                    "midpoint_utc": "2025-05-05T16:49:00Z",
                    "wavelength_um": 1.9341,
                    "bandwidth_um": 0.0469,
                },
                {
                    "product_id": "B",
                    "acquisition_id": "b",
                    "identity_status": "resolved",
                    "midpoint_utc": "2026-09-28T08:05:41Z",
                    "wavelength_um": 1.9333,
                    "bandwidth_um": 0.0476,
                },
            ],
            "spectral_prefilter": {"value": 0.02, "source": "Test policy; not NASA"},
            "checks": {
                "quality": {
                    "status": "unknown",
                    "reason": "Not measured",
                    "evidence_refs": [],
                }
            },
        }
        report = build_report(item)
        self.assertEqual(report["spectral_filter"]["status"], "pass")
        self.assertEqual(report["status"], "pending")


class RealPreviewIntegrityTests(unittest.TestCase):
    def test_report_matches_data_and_both_candidates_remain_pending(self):
        root = Path(__file__).resolve().parent.parent / "science_preview"
        cases = json.loads((root / "cases.json").read_text(encoding="utf-8"))["cases"]
        reports = json.loads((root / "reports.json").read_text(encoding="utf-8"))
        self.assertEqual({case["id"] for case in cases}, {"epsilon", "wise"})
        for case in cases:
            with self.subTest(case=case["id"]):
                self.assertEqual(reports[case["id"]], build_report(case))
                self.assertEqual(reports[case["id"]]["status"], "pending")
                for observation in case["observations"]:
                    self.assertTrue(
                        observation["source_url"].startswith(
                            "https://irsa.ipac.caltech.edu/"
                        )
                    )
                    pixels = observation["pixels"]
                    self.assertGreater(len(pixels), 0)
                    self.assertTrue(all(len(row) == len(pixels[0]) for row in pixels))

    def test_unattributed_threshold_is_not_used(self):
        item = {
            "observations": [{}, {}],
            "spectral_prefilter": {"value": 0.02},
            "checks": {},
        }
        self.assertEqual(build_report(item)["spectral_filter"]["status"], "unknown")

    def test_flux_filter_failure_does_not_reject_motion(self):
        item = {
            "kind": "astrometric_shift",
            "observations": [
                {"wavelength_um": 1.6, "bandwidth_um": 0.04},
                {"wavelength_um": 2.3, "bandwidth_um": 0.05},
            ],
            "spectral_prefilter": {
                "value": 0.02,
                "source": "Example",
                "applies_to": "flux_change",
            },
            "checks": {},
        }
        report = build_report(item)
        self.assertEqual(report["spectral_filter"]["status"], "fail")
        self.assertEqual(report["status"], "pending")


if __name__ == "__main__":
    unittest.main()
