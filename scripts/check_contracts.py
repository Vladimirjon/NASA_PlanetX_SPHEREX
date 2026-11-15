# /// script
# requires-python = ">=3.13"
# dependencies = ["jsonschema==4.26.0"]
# ///
"""Validate the SkyShift data contracts (contracts/*.schema.json) and every example.

Why: the Observation contract was first written as Markdown tables
(docs/specs/0001-arquitectura-observation.md). A schema plus this check makes it
verifiable: schemas are valid JSON Schema 2020-12, every example validates, and
the rules JSON Schema cannot express (ID rule, cross-references) are checked here.

Usage:  uv run --locked --script scripts/check_contracts.py
        (or: mise run check-contracts)
Exit code 1 if anything fails. Read-only: it never touches the network.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"
SPEC = ROOT / "docs" / "specs" / "0001-arquitectura-observation.md"
OBS_ID = "urn:skyshift:contract:observation:0.1-draft"
MANIFEST_ID = "urn:skyshift:contract:package-manifest:0.1-draft"
ANALYSIS_ID = "urn:skyshift:contract:analysis-result:0.1-draft"  # Mateo, spec 0010

# Official SPHEREx Level 2 file name (spec 0001 section 3.1). The process segment
# is l2b or l2b_retry in real data; the greedy obs_id backtracks to the last D<n>.
NAME_RX = re.compile(
    r"^level2_(?P<obs>.+)D(?P<det>[1-6])_spx_(?P<proc>l2b(?:_[a-z]+)?)-v(?P<ver>\d+)-(?P<pd>\d{4}-\d{3})\.fits$"
)

# Real file keys seen in IRSA SIA2 responses on 2026-11-14 (spec 0001 section 7.4),
# with the observation_id the rule must produce. Not synthetic.
ID_VECTORS = [
    (
        "dr1/level2/2025W19_1B/l2b-v27-2026-197/3/level2_2025W19_1B_0116_1D3_spx_l2b-v27-2026-197.fits",
        "spherex:dr1:2025W19_1B_0116_1:D3:l2b-v27-2026-197",
    ),
    (
        "dr1/level2/2025W46_1A/l2b_retry-v27-2026-207/6/level2_2025W46_1A_0090_1D6_spx_l2b_retry-v27-2026-207.fits",
        "spherex:dr1:2025W46_1A_0090_1:D6:l2b_retry-v27-2026-207",
    ),
    (
        "qr3/level2/2026W20_2A/l2b-v27-2026-267/3/level2_2026W20_2A_0294_4D3_spx_l2b-v27-2026-267.fits",
        "spherex:qr3:2026W20_2A_0294_4:D3:l2b-v27-2026-267",
    ),
]


def observation_id_from_key(key: str) -> str | None:
    """Apply the spec 0001 ID rule to an archive object key; None if it does not parse."""
    parts = key.split("/")
    m = NAME_RX.match(parts[-1])
    if len(parts) < 3 or parts[1] != "level2" or not m:
        return None
    return f"spherex:{parts[0]}:{m['obs']}:D{m['det']}:{m['proc']}-v{m['ver']}-{m['pd']}"


def unresolved_id(source: str) -> str:
    return "unresolved:" + hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]


EXAMPLE_MARK = re.compile(r"<!-- contract-example: observation -->\s*```json\n(.*?)```", re.S)


def spec_examples() -> list[tuple[str, dict]]:
    """Only JSON blocks explicitly marked as Observation examples; other JSON in the spec is ignored."""
    blocks = EXAMPLE_MARK.findall(SPEC.read_text(encoding="utf-8"))
    if not blocks:
        raise SystemExit(f"no marked Observation examples found in {SPEC.name}")
    return [(f"{SPEC.name} example {i}", json.loads(b)) for i, b in enumerate(blocks, 1)]


def product_ids(obs: dict) -> set[str]:
    p = obs["products"]
    ids = {p["native"]["product_id"]} | {c["product_id"] for c in p["calibrations"]}
    ids |= {d["asset"]["product_id"] for d in p["derived"]} | {d["asset"]["product_id"] for d in p["display"]}
    return ids


def semantic_observation(obs: dict) -> list[str]:
    """Rules JSON Schema cannot express. Returns a list of error messages."""
    errs: list[str] = []
    oid, native = obs["observation_id"], obs["products"]["native"]
    synthetic_sources = any(fs["kind"] == "synthetic" for fs in obs["provenance"]["field_sources"])
    if oid.startswith("synthetic:") != synthetic_sources:
        errs.append("synthetic: IDs and field_sources.kind=synthetic must go together")
    if obs["identity_status"] == "resolved":
        key = native["product_id"].removeprefix("spherex-file:")
        expected = observation_id_from_key(key)
        if expected != oid:
            errs.append(f"observation_id {oid!r} != ID rule result {expected!r}")
        m = NAME_RX.match(key.split("/")[-1])
        if m:
            if native["filename"] != key.split("/")[-1]:
                errs.append("products.native.filename does not match the product key")
            if obs["detector"] != int(m["det"]):
                errs.append("detector does not match the file name")
            # A resolved identity requires the SIA obs_id (spec 0001 section 3.1); OBSID may still be unread.
            if obs["source"]["obs_id"] != m["obs"]:
                errs.append("source.obs_id is missing or does not match the file name")
            if obs["source"]["acquisition_id"] not in (None, m["obs"]):
                errs.append("source.acquisition_id does not match the file name")
            if native["version"] != f"{m['proc']}-v{m['ver']}" or native["processing_date"] != m["pd"]:
                errs.append("products.native.version/processing_date do not match the file name")
    elif oid.startswith("unresolved:"):
        src = native["uri"] or obs["source"]["publisher_did"]
        if src is None or unresolved_id(src) != oid:
            errs.append("unresolved: ID must be sha256(uri or publisher_did)[:16]")
    known = product_ids(obs)
    refs = [r for r in (obs["quality"]["flags"], obs["quality"]["variance"]) if r] + obs["ancillary"]
    local = obs["spectral"]["local"]
    if local:
        refs += local["resources"]
        if local["method"] == "cwave_cband":
            cal = {c["product_id"] for c in obs["products"]["calibrations"]}
            if not {r["product_id"] for r in local["resources"]} <= cal:
                errs.append("cwave_cband resources must point to a linked calibration product")
    if obs["spatial_wcs"]:
        refs.append({"product_id": obs["spatial_wcs"]["product_id"]})
    for d in obs["products"]["derived"]:
        refs += [{"product_id": p} for p in d["parent_product_ids"]] + d["quality_refs"]
        if d["asset"]["product_id"] in d["parent_product_ids"]:
            errs.append(f"derived product {d['asset']['product_id']!r} lists itself as parent")
    refs += [{"product_id": d["source_product_id"]} for d in obs["products"]["display"]]
    for r in refs:
        if r["product_id"] not in known:
            errs.append(f"reference to unknown product {r['product_id']!r}")
    return errs


def semantic_manifest(man: dict) -> list[str]:
    errs: list[str] = []
    obs_ids = [o["observation_id"] for o in man["observations"]]
    if len(obs_ids) != len(set(obs_ids)):
        errs.append("duplicate observation_id in manifest")
    for o in man["observations"]:
        errs += [f"{o['observation_id']}: {e}" for e in semantic_observation(o)]
    for c in man["cases"]:
        missing = set(c["observation_ids"]) - set(obs_ids)
        if missing:
            errs.append(f"case {c['case_ref']} references observations not in the package: {sorted(missing)}")
    known = set().union(*(product_ids(o) for o in man["observations"])) if man["observations"] else set()
    paths = [a["path"] for a in man["assets"]]
    if len(paths) != len(set(paths)):
        errs.append("duplicate asset path")
    for a in man["assets"]:
        if a["product_id"] is not None and a["product_id"] not in known:
            errs.append(f"asset {a['path']} points to unknown product {a['product_id']!r}")
    synthetic = [o for o in man["observations"] if o["observation_id"].startswith("synthetic:")]
    if man["content_origin"] == "irsa_snapshot" and synthetic:
        errs.append("irsa_snapshot package contains synthetic observations")
    if man["content_origin"] == "synthetic_fixture" and len(synthetic) != len(man["observations"]):
        errs.append("synthetic_fixture package mixes real and synthetic observations")
    return errs


def negative_cases(real: dict, manifest: dict) -> list[tuple[str, str, dict]]:
    """Mutations that MUST be rejected; proves the checks are not vacuous."""

    def mut(doc: dict, fn) -> dict:
        d = copy.deepcopy(doc)
        fn(d)
        return d

    def ws(d):  # cwave_cband without CBAND
        d["spectral"]["local"]["resources"] = d["spectral"]["local"]["resources"][:1]

    def snap(d):  # synthetic observation inside a real snapshot
        d["content_origin"] = "irsa_snapshot"

    return [
        (
            "observation_id not built by the rule",
            OBS_ID,
            mut(real, lambda d: d.update(observation_id="spherex:dr1:X:D3:l2b-v27-2026-197")),
        ),
        ("detector disagrees with file name", OBS_ID, mut(real, lambda d: d.update(detector=4))),
        ("cwave_cband without CBAND resource", OBS_ID, mut(real, ws)),
        ("RA out of range", OBS_ID, mut(real, lambda d: d["coverage"]["center"].update(ra_deg=400.0))),
        (
            "ISO time with Z suffix added",
            OBS_ID,
            mut(real, lambda d: d["time"]["samples"][2].update(value=d["time"]["samples"][2]["value"] + "Z")),
        ),
        (
            "unknown issue code",
            OBS_ID,
            mut(real, lambda d: d["issues"].append({"code": "looks_fine", "paths": ["/"], "detail": "x"})),
        ),
        (
            "reference to an unlinked product",
            OBS_ID,
            mut(real, lambda d: d["quality"]["flags"].update(product_id="spherex-file:dr1/level2/other.fits")),
        ),
        ("calibration_linked without calibrations", OBS_ID, mut(real, lambda d: d["products"].update(calibrations=[]))),
        ("synthetic observation in irsa_snapshot", MANIFEST_ID, mut(manifest, snap)),
        (
            "complete package with missing assets",
            MANIFEST_ID,
            mut(manifest, lambda d: d["completeness"].update(status="complete", verified_at="2026-11-14T00:00:00Z")),
        ),
        ("discovery stage with header-only fields", OBS_ID, mut(real, discovery)),
        (
            "cwave_cband before calibration_linked",
            OBS_ID,
            mut(real, lambda d: d.update(metadata_stage="file_inspected")),
        ),
        (
            "prepared=available without derived products",
            OBS_ID,
            mut(real, lambda d: d["availability"].update(prepared="available")),
        ),
        (
            "display=available without display products",
            OBS_ID,
            mut(real, lambda d: d["availability"].update(display="available")),
        ),
        ("resolved without SIA obs_id", OBS_ID, mut(real, lambda d: d["source"].update(obs_id=None))),
        ("resolved without file version", OBS_ID, mut(real, lambda d: d["products"]["native"].update(version=None))),
        (
            "empty pipeline DQA string",
            OBS_ID,
            mut(real, lambda d: d["quality"]["pipeline_assessment"].update(l2_dqa="")),
        ),
        (
            "derived product with unknown parent",
            OBS_ID,
            mut(real, lambda d: d["products"]["derived"].append(derived(d))),
        ),
        (
            "display product with unknown source",
            OBS_ID,
            mut(real, lambda d: d["products"]["display"].append(display(d))),
        ),
        (
            "synthetic_fixture containing a real observation",
            MANIFEST_ID,
            mut(manifest, lambda d: d["observations"].append(real)),
        ),
        (
            "unverified package with verified_at",
            MANIFEST_ID,
            mut(manifest, lambda d: d["completeness"].update(status="unverified", verified_at="2026-11-14T00:00:00Z")),
        ),
        ("complete package without cases", MANIFEST_ID, mut(manifest, complete_without_cases)),
        ("case_text asset with a product_id", MANIFEST_ID, mut(manifest, asset("case/a.md", "case_text", PKG_PRODUCT))),
        (
            "native_cutout asset without product_id",
            MANIFEST_ID,
            mut(manifest, asset("cutouts/a.fits", "native_cutout", None)),
        ),
    ] + [
        (f"asset path {p!r}", MANIFEST_ID, mut(manifest, asset(p, "derived", PKG_PRODUCT)))
        for p in ("../x.fits", "./x.fits", "a//b.fits", "a/", "/a.fits", "a/../b.fits", "..")
    ]


PKG_PRODUCT = "synthetic:package-product-a"
BAD_PRODUCT_IDS = ["spherex-file:../x.fits", "spherex-file:dr1//x.fits", "spherex-file:dr1/./x.fits", "derived:abc"]


def discovery(d: dict) -> None:
    d.update(metadata_stage="discovery")
    d["spectral"]["local"] = None
    d["products"]["calibrations"] = []


def transformation() -> dict:
    return {
        "operation": "cutout",
        "method": "irsa_cutout_service",
        "software": {"name": "test", "version": "0"},
        "parameters": {"size_deg": 0.02},
        "executed_at": "2026-11-14T00:00:00Z",
        "evidence_ref": "test",
    }


def asset_ref(prefix: str) -> dict:
    return {
        "product_id": f"{prefix}:{'a' * 64}",
        "uri": None,
        "format": None,
        "filename": None,
        "version": None,
        "processing_date": None,
        "sha256": None,
    }


def derived(d: dict) -> dict:
    return {
        "asset": asset_ref("derived"),
        "parent_product_ids": ["spherex-file:dr1/level2/unknown.fits"],
        "transformations": [transformation()],
        "wcs_ref": None,
        "quality_refs": [],
        "scientific_unit": None,
    }


def display(d: dict) -> dict:
    return {
        "asset": asset_ref("display"),
        "source_product_id": "spherex-file:dr1/level2/unknown.fits",
        "transformations": [transformation()],
        "purpose": "display_only",
    }


def complete_without_cases(d: dict) -> None:
    d["cases"] = []
    d["completeness"].update(status="complete", verified_at="2026-11-14T00:00:00Z", missing=[])


def asset(path: str, role: str, product_id: str | None):
    def add(d: dict) -> None:
        d["assets"].append(
            {
                "path": path,
                "sha256": "0" * 64,
                "bytes": 1,
                "media_type": "application/octet-stream",
                "product_id": product_id,
                "role": role,
            }
        )

    return add


def main() -> int:
    failures = 0
    schemas = {}
    for path in sorted(CONTRACTS.glob("*.schema.json")):
        schema = json.loads(path.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        schemas[schema["$id"]] = schema
        print(f"ok   schema {path.name}")
    registry = Registry().with_resources((sid, Resource.from_contents(s)) for sid, s in schemas.items())
    validators = {sid: Draft202012Validator(s, registry=registry) for sid, s in schemas.items()}

    for key, expected in ID_VECTORS:
        got = observation_id_from_key(key)
        ok = got == expected and bool(
            validators[OBS_ID].evolve(schema={"$ref": f"{OBS_ID}#/$defs/ObservationId"}).is_valid(got)
        )
        failures += not ok
        print(f"{'ok  ' if ok else 'FAIL'} id-rule {key.split('/')[-1]} -> {got}")

    cases: list[tuple[str, str, dict]] = [(OBS_ID, name, doc) for name, doc in spec_examples()]
    for path in sorted((CONTRACTS / "examples").glob("*.json")):
        if path.name.startswith("package-manifest"):
            sid = MANIFEST_ID
        elif path.name.startswith("analysis-result"):
            sid = ANALYSIS_ID
        else:
            sid = OBS_ID
        cases.append((sid, f"examples/{path.name}", json.loads(path.read_text(encoding="utf-8"))))
    for sid, name, doc in cases:
        errs = [f"{'/'.join(map(str, e.absolute_path)) or '/'}: {e.message}" for e in validators[sid].iter_errors(doc)]
        if not errs:
            if sid == OBS_ID:
                errs = semantic_observation(doc)
            elif sid == MANIFEST_ID:
                errs = semantic_manifest(doc)
        failures += bool(errs)
        print(f"{'ok  ' if not errs else 'FAIL'} {name}")
        for e in errs:
            print(f"       {e}")
    real = next(doc for sid, name, doc in cases if name.startswith("examples/observation-real"))
    manifest = next(doc for sid, name, doc in cases if name.startswith("examples/package-manifest"))
    negatives = negative_cases(real, manifest)
    product_id_check = validators[OBS_ID].evolve(schema={"$ref": f"{OBS_ID}#/$defs/ProductId"})
    for bad in BAD_PRODUCT_IDS:
        rejected = not product_id_check.is_valid(bad)
        failures += not rejected
        print(f"{'ok  ' if rejected else 'FAIL'} rejects product_id {bad!r}")
    control = copy.deepcopy(manifest)
    asset("cutouts/a.fits", "derived", PKG_PRODUCT)(control)
    asset("case/a.md", "case_text", None)(control)
    control_ok = validators[MANIFEST_ID].is_valid(control) and not semantic_manifest(control)
    failures += not control_ok
    print(f"{'ok  ' if control_ok else 'FAIL'} accepts valid assets (control for the path cases)")
    for name, sid, doc in negatives:
        rejected = not validators[sid].is_valid(doc) or bool(
            semantic_observation(doc) if sid == OBS_ID else semantic_manifest(doc)
        )
        failures += not rejected
        print(f"{'ok  ' if rejected else 'FAIL'} rejects: {name}")
    print(
        f"{len(schemas)} schemas, {len(ID_VECTORS)} id vectors, {len(cases)} examples, "
        f"{len(negatives)} negative cases, {failures} failures"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
