"""Build an offline, evidence-labelled preview from supplied observation metadata."""

import json
from dataclasses import asdict
from pathlib import Path

from science.validation import (
    aggregate_checks,
    check_observation_identity,
    spectral_check,
)


def build_report(item: dict[str, object]) -> dict[str, object]:
    """Calculate preliminary checks without promoting unverified evidence."""
    observations = item.get("observations")
    if not isinstance(observations, list) or len(observations) != 2:
        raise ValueError("A preview case must have exactly two observations.")
    first, second = observations
    if not isinstance(first, dict) or not isinstance(second, dict):
        raise TypeError("Observations must be objects.")
    identity = check_observation_identity(first, second)
    raw_policy = item.get("spectral_prefilter")
    policy = raw_policy if isinstance(raw_policy, dict) else {}
    threshold = (
        policy.get("value")
        if isinstance(policy.get("source"), str) and policy["source"].strip()
        else None
    )
    spectral = spectral_check(
        first.get("wavelength_um"),
        second.get("wavelength_um"),
        first.get("bandwidth_um"),
        second.get("bandwidth_um"),
        threshold,
    )
    raw_checks = item.get("checks")
    if not isinstance(raw_checks, dict):
        raw_checks = {}
    checks: dict[str, str] = {}
    for name, record in raw_checks.items():
        if not isinstance(record, dict):
            continue
        status = record.get("status")
        refs = record.get("evidence_refs")
        has_evidence = isinstance(refs, list) and any(
            isinstance(ref, str) and ref.strip() for ref in refs
        )
        checks[name] = (
            status
            if status in ("pass", "fail", "warning", "unknown")
            and (status != "pass" or has_evidence)
            else "unknown"
        )
    checks["identity"] = identity.status
    checks["time"] = identity.status
    # A wavelength prefilter is never evidence of overall spectral equivalence.
    if (
        spectral.status == "fail"
        and policy.get("applies_to") == item.get("kind") == "flux_change"
    ):
        checks["spectral_compatibility"] = "fail"
    return {
        "status": aggregate_checks(checks, stage=item.get("stage", "preselection")),
        "identity": asdict(identity),
        "spectral_filter": asdict(spectral),
        "checks": checks,
    }


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "science_preview"
    data = json.loads((root / "cases.json").read_text(encoding="utf-8"))
    reports = {item["id"]: build_report(item) for item in data["cases"]}
    (root / "reports.json").write_text(
        json.dumps(reports, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
