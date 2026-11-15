"""Offline precompute of the first-delivery motion measurement (spec 0010 §0, plan 0011 task 13).

Composition root for a one-shot run (same adapters as the API). Writes the AnalysisResult
JSON for the demo; it never runs inside a request.

    mise run measure-epsindb
    (= uv run --directory backend python -m skyshift.api.measure_cli
       --out ../frontend/public/demo/epsilon-indi-b/analysis-result.json)
"""

import argparse
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any

import httpx

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.adapters.irsa_sia import IrsaSia2Catalog
from skyshift.adapters.s3_archive import S3ImageArchive
from skyshift.api.analysis_json import analysis_result_json
from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations
from skyshift.application.measure_target import MeasureRequest, MeasureTarget
from skyshift.application.tiered_cache import TieredResolver
from skyshift.config import Settings
from skyshift.domain.measurement.criteria import MeasurementCriteria, Threshold
from skyshift.domain.motion import Motion
from skyshift.domain.position import SkyPosition

CRITERIA_REF = "Sebastián, messages of 2026-11-14 + spec 0032 (scientific-rules); provisional"
EPS_IND_B_SOURCE = "Gaia DR3 6412596012146801152, J2016.0 (docs/context/12 §7)"


def eps_ind_b_request(detector: int) -> MeasureRequest:
    return MeasureRequest(
        label="Epsilon Indi B",
        position=SkyPosition(331.0764526, -56.79381207),
        position_source=EPS_IND_B_SOURCE,
        motion=Motion(3981.977, -2466.832, 270.658, 2016.0),
        motion_source=EPS_IND_B_SOURCE + " (photocenter of the unresolved Ba+Bb pair)",
        detector=detector,
        criteria=MeasurementCriteria(
            reference=CRITERIA_REF,
            min_snr_per_exposure=Threshold(5.0, "R11, Sebastián 14-nov"),
            min_significance_sigma_two_sided=Threshold(5.0, "R12, Sebastián 14-nov, 0032 §3.3"),
            sigma_wcs_arcsec_per_axis=Threshold(
                0.3, "Expsupp v2.0 §4.2.2 fig. 20 RMS per axis; provisional (A5)"
            ),
            flag_radius_px=Threshold(2.5, "IRSA CONTAINS_BAD_PIXEL radius, Expsupp §3.3; D12 §6"),
        ),
    )


def _git_commit() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"],  # noqa: S607
            capture_output=True, text=True, check=True, timeout=10,
        )  # fmt: skip
        return out.stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


async def run(detector: int) -> dict[str, Any]:
    cfg = Settings()
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(max(cfg.upstream_timeout_s, 60.0), connect=10.0),
        follow_redirects=False,
        headers={"User-Agent": "SkyShift/0.1 (NASA Space Apps 2026)"},
    ) as client:
        store = FilesystemBlobStore(cfg.cache_dir)
        sia = TieredResolver(store, memory_max_bytes=16 * 1024 * 1024)
        s3 = TieredResolver(store, memory_max_bytes=128 * 1024 * 1024)
        measure = MeasureTarget(
            ListObservations(sia, IrsaSia2Catalog(client)),
            FrameReader(s3, S3ImageArchive(client)),
        )
        result = await measure(eps_ind_b_request(detector))
    return analysis_result_json(
        result, analysis_id=f"AR-epsilon-indi-b-motion-D{detector}", code_ref=_git_commit()
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--detector", type=int, default=3, choices=range(1, 7))
    args = parser.parse_args()
    doc = asyncio.run(run(args.detector))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    astrometry = doc.get("astrometry")
    print(json.dumps({"outcome": doc["outcome"], "astrometry": astrometry}, indent=1)[:3000])


if __name__ == "__main__":
    main()
