"""Synthetic tests; none of these inputs are astronomical observations."""

import json
import unittest
from pathlib import Path

from science.checklists import build_checklist
from science.validation import astrometric_p_value


class ChecklistTests(unittest.TestCase):
    def setUp(self):
        self.first = {
            "product_id": "synthetic-a",
            "acquisition_id": "a",
            "identity_status": "resolved",
            "midpoint_utc": "2025-01-01T00:00:00Z",
        }
        self.second = {
            "product_id": "synthetic-b",
            "acquisition_id": "b",
            "identity_status": "resolved",
            "midpoint_utc": "2026-01-01T00:00:00Z",
        }
        self.case = {"observations": [self.first, self.second], "checks": {}}

    def test_methods_have_separate_controls_and_missing_reason(self):
        movement = build_checklist(self.case, "motion")
        brightness = build_checklist(self.case, "brightness")
        self.assertIn("centroid_color_bias", movement["checks"])
        self.assertIn("photometric_response", brightness["checks"])
        for result in (movement, brightness):
            self.assertEqual(result["status"], "pending")
            self.assertTrue(all(check["reason"] for check in result["checks"].values()))

    def test_identical_acquisitions_and_repeated_times_are_rejected(self):
        self.second["acquisition_id"] = "a"
        self.assertEqual(build_checklist(self.case, "motion")["status"], "rejected")
        self.second["acquisition_id"] = "b"
        self.second["midpoint_utc"] = self.first["midpoint_utc"]
        self.assertEqual(build_checklist(self.case, "motion")["status"], "rejected")

    def test_missing_evidence_cannot_approve(self):
        self.case["checks"] = {
            "quality": {"status": "pass", "reason": "claimed", "evidence_refs": []}
        }
        quality = build_checklist(self.case, "brightness")["checks"]["quality"]
        self.assertEqual(quality["status"], "unknown")

    def test_malformed_status_is_unknown(self):
        self.case["checks"] = {
            "quality": {
                "status": ["pass"],
                "reason": "malformed",
                "evidence_refs": ["synthetic"],
            }
        }
        self.assertEqual(
            build_checklist(self.case, "motion")["checks"]["quality"]["status"],
            "unknown",
        )

    def test_full_evidence_can_enable_measurement_not_scientific_evaluation(self):
        required = build_checklist(self.case, "motion")["checks"]
        self.case["checks"] = {
            name: {
                "status": "pass",
                "reason": "synthetic evidence",
                "evidence_refs": ["synthetic"],
            }
            for name in required
            if name not in {"identity", "time"}
        }
        self.case["stage"] = "prepared"
        result = build_checklist(self.case, "motion")
        self.assertEqual(result["status"], "eligible_for_method")
        self.assertNotIn("evaluated", result.values())

    def test_missing_time_is_pending(self):
        del self.second["midpoint_utc"]
        result = build_checklist(self.case, "motion")
        self.assertEqual(result["status"], "pending")
        self.assertEqual(result["checks"]["time"]["status"], "unknown")

    def test_synthetic_zero_and_known_displacements(self):
        # These are supplied position differences, not recovered image centroids.
        covariance = ((1.0, 0.0), (0.0, 1.0))
        same = astrometric_p_value((0.0, 0.0), covariance)
        shifted = astrometric_p_value((3.0, 4.0), covariance)
        self.assertEqual(same.statistic, 0.0)
        self.assertEqual(same.p_value, 1.0)
        self.assertEqual(shifted.statistic, 25.0)

    def test_synthetic_identical_and_shifted_pixel_scenes(self):
        # One artificial pixel source, no background. This is only a controlled
        # input to the statistical rule, not a test of a real centroid method.
        def center(scene):
            total = sum(sum(row) for row in scene)
            return tuple(
                sum(
                    value * (x if axis == 0 else y)
                    for y, row in enumerate(scene)
                    for x, value in enumerate(row)
                )
                / total
                for axis in (0, 1)
            )

        image = [[float((x, y) == (1, 1)) for x in range(4)] for y in range(4)]
        moved = [[float((x, y) == (2, 1)) for x in range(4)] for y in range(4)]
        original_position = center(image)
        self.assertEqual(center(image), original_position)
        delta = tuple(b - a for a, b in zip(original_position, center(moved)))
        self.assertEqual(delta, (1.0, 0.0))
        result = astrometric_p_value(delta, ((1.0, 0.0), (0.0, 1.0)))
        self.assertEqual(result.statistic, 1.0)

    def test_real_case_reports_match_current_data_and_remain_pending(self):
        root = Path(__file__).resolve().parent.parent
        cases = json.loads((root / "science_preview/cases.json").read_text())["cases"]
        reports = json.loads((root / "science/real-checklists.json").read_text())
        for case in cases:
            for kind in ("motion", "brightness"):
                result = build_checklist(case, kind)
                self.assertEqual(reports[case["id"]][kind], result)
                self.assertEqual(result["status"], "pending")


if __name__ == "__main__":
    unittest.main()
