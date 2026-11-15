"""Check that the browser assets remain tied to the reviewed D3 pair."""

import json
import math
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend/public/demo/epsilon-indi-b-d3"
CONTROLS = ROOT / "docs/reviews/measurement/epsilon-indi-b-pair-controls.json"
MANIFEST = ROOT / "data/packages/eps-indi-b-d3/package-manifest.json"


class EpsilonIndiBDisplayTests(unittest.TestCase):
    def test_series_and_measurement_are_the_same_reviewed_observations(self):
        series = json.loads((ASSETS / "series.json").read_text(encoding="utf8"))
        case = json.loads((ASSETS / "case.json").read_text(encoding="utf8"))
        controls = json.loads(CONTROLS.read_text(encoding="utf8"))
        manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
        assert series["comparability"]["level"] == "OBSERVED"
        assert case["interpretation_ceiling"] == "OBSERVED"
        assert case["case_ref"] == manifest["cases"][0]["case_ref"]
        assert case["observation_ids"] == [f["obs_id"] for f in series["frames"]]
        assert case["observation_ids"] == [
            controls["pair"][k]["observation_id"] for k in ("A", "B")
        ]
        assert math.isclose(
            case["separation_arcsec"], math.hypot(*controls["pair_displacement"]["delta_arcsec"])
        )
        assert len(series["frames"]) == 2
        for frame, observation, key in zip(
            series["frames"], manifest["observations"], ("A", "B"), strict=True
        ):
            native = observation["products"]["native"]
            assert frame["detector"] == 3
            assert frame["provenance"]["source_url"] == native["uri"]
            assert frame["provenance"]["sha256"] == native["sha256"]
            time = next(
                t["value"]
                for t in observation["time"]["samples"]
                if t["role"] == "midpoint" and t["format"] == "ISO8601"
            )
            assert frame["t_mid"] == time + "Z"
            spectral = controls["pair"][key]["spectral"]
            assert frame["wavelength_um"] == spectral["cwave_um"]
            assert frame["bandwidth_um"] == spectral["cband_um"]
            path = ASSETS / Path(frame["data_url"]).name
            pixels = list(struct.iter_unpack("<f", path.read_bytes()))
            assert len(pixels) == math.prod(series["grid"]["shape"])
            assert any(math.isfinite(pixel) for (pixel,) in pixels)
