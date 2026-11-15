"""Build method-specific checklists from supplied evidence, without certifying it."""

import json
from collections.abc import Mapping
from pathlib import Path

from science.validation import check_observation_identity

COMMON = (
    "identity",
    "time",
    "target",
    "coverage",
    "alignment",
    "quality",
    "uncertainty",
    "method",
)
METHOD_CONTROLS = {
    "motion": ("centroid_color_bias",),
    "brightness": ("spectral_compatibility", "photometric_response", "background"),
}


def build_checklist(case: Mapping[str, object], kind: str) -> dict[str, object]:
    """List controls for one method; pass/fail evidence is supplied by the caller.

    References are not automatically verified; scientific review is still required.
    This internal report is not a shared API contract or a scientific traffic light.
    """
    if kind not in METHOD_CONTROLS:
        raise ValueError("Unknown measurement method")
    observations = case.get("observations")
    if (
        not isinstance(observations, list)
        or len(observations) != 2
        or not all(isinstance(item, Mapping) for item in observations)
    ):
        raise ValueError("Exactly two observation records are required")
    identity = check_observation_identity(observations[0], observations[1])
    raw = case.get("checks")
    records = raw if isinstance(raw, Mapping) else {}
    checks = {}
    for name in COMMON + METHOD_CONTROLS[kind]:
        if name in {"identity", "time"}:
            checks[name] = {
                "status": identity.status,
                "reason": identity.reason,
                "evidence_refs": [],
            }
            continue
        record = records.get(name)
        record = record if isinstance(record, Mapping) else {}
        reason = record.get("reason")
        reason = (
            reason
            if isinstance(reason, str) and reason.strip()
            else "Evidence not provided."
        )
        refs = record.get("evidence_refs")
        refs = (
            [ref for ref in refs if isinstance(ref, str) and ref.strip()]
            if isinstance(refs, list)
            else []
        )
        status = record.get("status")
        if status not in ("pass", "fail") or not refs:
            if status in ("pass", "fail") and not refs:
                reason = "The supplied result has no evidence reference: " + reason
            status = "unknown"
        checks[name] = {"status": status, "reason": reason, "evidence_refs": refs}
    statuses = [check["status"] for check in checks.values()]
    status = "rejected" if "fail" in statuses else "pending"
    if case.get("stage") == "prepared" and all(value == "pass" for value in statuses):
        status = "eligible_for_method"
    return {"method": kind, "status": status, "checks": checks}


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    cases = json.loads(
        (root / "science_preview/cases.json").read_text(encoding="utf-8")
    )["cases"]
    reports = {
        case["id"]: {kind: build_checklist(case, kind) for kind in METHOD_CONTROLS}
        for case in cases
    }
    (root / "science/real-checklists.json").write_text(
        json.dumps(reports, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
