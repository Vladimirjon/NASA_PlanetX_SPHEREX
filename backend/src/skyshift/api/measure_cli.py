"""Offline precompute of the first-delivery motion measurement (spec 0010 §0, plan 0011 task 13).

Composition root for a one-shot run (same adapters as the API). Writes the AnalysisResult
JSON for the demo and, optionally, the evidence for Sebastián's method checklist
(science/checklists.py, spec 0034) on the exact pair he audits. It never runs in a request.

    mise run measure-epsindb
"""

import argparse
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any

import httpx

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.adapters.irsa_gaia import IrsaGaiaDr3
from skyshift.adapters.irsa_sia import IrsaSia2Catalog
from skyshift.adapters.s3_archive import S3ImageArchive
from skyshift.api.analysis_json import analysis_result_json
from skyshift.api.checklist_evidence import checklist_evidence
from skyshift.application.frame_reader import FrameReader
from skyshift.application.list_observations import ListObservations
from skyshift.application.measure_target import (
    FieldControls,
    MeasureRequest,
    MeasureTarget,
    MotionMeasurement,
    ReferenceStars,
)
from skyshift.application.tiered_cache import TieredResolver
from skyshift.config import Settings
from skyshift.domain.measurement.criteria import MeasurementCriteria, Threshold
from skyshift.domain.measurement.registration import SPHEREX_PIXEL_ARCSEC, ReferenceSelection
from skyshift.domain.motion import Motion
from skyshift.domain.position import SkyPosition

CRITERIA_REF = "Sebastián, messages of 2026-11-14 + spec 0032 (scientific-rules); provisional"
EPS_IND_B_SOURCE = "Gaia DR3 6412596012146801152, J2016.0 (docs/context/12 §7)"
# The pair Sebastián audits in science_preview/cases.json (branch scientific-rules).
SEBASTIAN_PAIR = ("2025W24_1A_0245_4", "2026W40_1A_0070_2")

# Method parameters of the field-star controls (not science thresholds; recorded in the JSON).
FIELD = FieldControls(
    catalog_radius_arcsec=240.0,  # covers the 81x81 px box read per exposure
    selection=ReferenceSelection(
        g_min=11.0,  # brighter stars risk SPHEREx non-linearity; flags also exclude them
        g_max=17.5,  # fainter ones are usually below SNR 5 in one exposure
        max_ruwe=1.4,  # usual Gaia "well-behaved astrometry" cut (Lindegren et al. 2021)
        min_target_sep_arcsec=30.0,
        isolation_arcsec=2 * SPHEREX_PIXEL_ARCSEC,
        isolation_delta_g=3.0,
        max_count=15,
    ),
    neighbor_radius_arcsec=3 * SPHEREX_PIXEL_ARCSEC,
    # A real WCS error is < 1 arcsec (Expsupp 4.2.2); a fit 1 px away is another source.
    identification_radius_arcsec=SPHEREX_PIXEL_ARCSEC,
)


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
                0.3, "Expsupp v2.0 §4.2.2 fig. 20 RMS per axis; provisional floor (A5)"
            ),
            flag_radius_px=Threshold(2.5, "IRSA CONTAINS_BAD_PIXEL radius, Expsupp §3.3; D12 §6"),
        ),
        field=FIELD,
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


async def run(detector: int) -> MotionMeasurement:
    cfg = Settings()
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(max(cfg.upstream_timeout_s, 60.0), connect=10.0),
        follow_redirects=False,
        headers={"User-Agent": "SkyShift/0.1 (NASA Space Apps 2026)"},
    ) as client:
        store = FilesystemBlobStore(cfg.cache_dir)
        sia = TieredResolver(store, memory_max_bytes=16 * 1024 * 1024)
        s3 = TieredResolver(store, memory_max_bytes=256 * 1024 * 1024)
        gaia = TieredResolver(store, memory_max_bytes=4 * 1024 * 1024)
        measure = MeasureTarget(
            ListObservations(sia, IrsaSia2Catalog(client)),
            FrameReader(s3, S3ImageArchive(client)),
            ReferenceStars(gaia, IrsaGaiaDr3(client)),
        )
        return await measure(eps_ind_b_request(detector))


def _write(path: Path, doc: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--checklist-out", type=Path, default=None)
    parser.add_argument("--detector", type=int, default=3, choices=range(1, 7))
    args = parser.parse_args()
    result = asyncio.run(run(args.detector))
    commit = _git_commit()
    doc = analysis_result_json(
        result, analysis_id=f"AR-epsilon-indi-b-motion-D{args.detector}", code_ref=commit
    )
    _write(args.out, doc)
    if args.checklist_out is not None:
        _write(
            args.checklist_out,
            checklist_evidence(result, SEBASTIAN_PAIR, result_ref=str(args.out), code_ref=commit),
        )
    summary = {k: doc[k] for k in ("outcome", "field_sources")}
    astrometry: dict[str, Any] = doc["astrometry"] or {}
    summary["astrometry"] = {
        k: astrometry.get(k)
        for k in ("proper_motion", "applied_sigma_wcs_arcsec", "reference_star_check",
                  "wavelength_dependence", "sensitivity", "fit_residual_rms_arcsec")
    }  # fmt: skip
    print(json.dumps(summary, indent=1)[:6000])


if __name__ == "__main__":
    main()
