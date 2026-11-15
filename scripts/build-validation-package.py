# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["astropy==8.0.2", "numpy==2.5.4", "httpx==0.28.1", "jsonschema==4.26.0"]
# ///
"""Build the verifiable validation package for the epsilon Indi B D3 pair (spec 0034 request).

What it does (needs network; real NASA/IRSA data only, nothing invented):
  1. SIA2 query -> publisher DID, MJD range, footprint, release date of both exposures.
  2. Download both original Level-2 files and the Spectral WCS calibration (DR1 and QR3 copies),
     sha256 each. Originals/calibrations stay in data/raw/ (never committed).
  3. Download one wide IBE cutout per exposure (same centre and size, so both cover the same
     sky box and the reference stars around the target) and sha256 it.
  4. PROVE the cutout -> original-pixel link: derive the native offset from the cutout's linear
     WCS "A", then check IMAGE/FLAGS/VARIANCE/ZODI are bit-identical to the original sub-array.
  5. Extract CWAVE/CBAND for the same native box, read them at the target pixel.
  6. Write package-manifest.json (contracts/package-manifest.schema.json) and verify it.

Usage:  uv run --locked --script scripts/build-validation-package.py [--out data/packages/eps-indi-b-d3]
Use --verify [--package DIR] for offline integrity/contract checks and crash recovery.
Use --lambda-at --package DIR --epoch A --x X --y Y for a read-only wavelength query.
Exit code 1 on any failed check; existing raw files must match the pinned snapshot hashes.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import math
import os
import shutil
import tempfile
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from types import ModuleType
from typing import Any

import astropy
import httpx
import numpy as np
from astropy.io import fits
from astropy.io.votable import parse_single_table
from astropy.wcs import WCS

ROOT = Path(__file__).resolve().parent.parent
IBE = "https://irsa.ipac.caltech.edu/ibe/data/spherex"
S3 = "https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com"
SIA = "https://irsa.ipac.caltech.edu/SIA"
ACK = "https://irsa.ipac.caltech.edu/Missions/spherex.html"

# Spec 0032 section 4.1 pair (confirmed by the team 14-nov-2026). Centre as in that spec so the
# cutouts are comparable; 0.12 deg (~70 px) leaves room for reference stars around the target.
CENTER_RA, CENTER_DEC, SIZE_DEG = 331.095, -56.801, 0.12


@dataclass(frozen=True)
class Exposure:
    label: str  # A = earlier, B = later
    collection: str  # SIA COLLECTION value
    release: str  # dr1 | qr3
    week: str  # e.g. 2025W24_1A
    obs_id: str  # e.g. 2025W24_1A_0245_4
    proc: str  # e.g. l2b-v27-2026-201
    detector: int = 3

    @property
    def key(self) -> str:
        return (
            f"{self.release}/level2/{self.week}/{self.proc}/{self.detector}/"
            f"level2_{self.obs_id}D{self.detector}_spx_{self.proc}.fits"
        )

    @property
    def filename(self) -> str:
        return self.key.rsplit("/", 1)[-1]

    @property
    def observation_id(self) -> str:
        return f"spherex:{self.release}:{self.obs_id}:D{self.detector}:{self.proc}"

    @property
    def publisher_did(self) -> str:
        return f"ivo://irsa.ipac/{self.collection}?{self.obs_id}/D{self.detector}"

    @property
    def calibration_key(self) -> str:
        return (
            f"{self.release}/spectral_wcs/cal-swcs-v5-2026-191/{self.detector}/"
            f"spectral_wcs_D{self.detector}_spx_cal-swcs-v5-2026-191.fits"
        )


EXPOSURES = (
    Exposure("A", "spherex_dr1", "dr1", "2025W24_1A", "2025W24_1A_0245_4", "l2b-v27-2026-201"),
    Exposure("B", "spherex_qr3", "qr3", "2026W40_1A", "2026W40_1A_0070_2", "l2b-v27-2026-276"),
)


def utc_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(client: httpx.Client, url: str) -> httpx.Response:
    """GET with backoff: IRSA answers 502/503 intermittently."""
    last: Exception | None = None
    for attempt in range(8):
        try:
            r = client.get(url)
            if r.status_code < 500:
                r.raise_for_status()
                return r
            last = httpx.HTTPStatusError(f"HTTP {r.status_code}", request=r.request, response=r)
        except httpx.TransportError as exc:
            last = exc
        time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"giving up on {url}: {last}")


def download(
    client: httpx.Client, url: str, dest: Path, expected_sha: str | None = None
) -> tuple[str, int]:
    """Validate a sibling partial file before replacing dest; raw snapshots are pinned."""
    if expected_sha is not None and dest.exists():
        actual = sha_file(dest)
        if actual != expected_sha:
            raise RuntimeError(f"raw checksum mismatch: {dest}")
        return actual, dest.stat().st_size
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=dest.name + ".", suffix=".part", dir=dest.parent)
    os.close(fd)
    partial = Path(name)
    try:
        for attempt in range(6):
            sha, size = hashlib.sha256(), 0
            try:
                with client.stream("GET", url) as r:
                    if r.status_code >= 500:
                        raise httpx.TransportError(f"HTTP {r.status_code}")
                    r.raise_for_status()
                    announced = r.headers.get("content-length")
                    with partial.open("wb") as fh:
                        for chunk in r.iter_bytes(1 << 20):
                            fh.write(chunk)
                            sha.update(chunk)
                            size += len(chunk)
                if announced is not None and int(announced) != size:
                    raise httpx.TransportError(f"truncated: {size} of {announced} bytes")
                if expected_sha is not None and sha.hexdigest() != expected_sha:
                    raise RuntimeError(f"download checksum mismatch: {url}")
                os.replace(partial, dest)
                return sha.hexdigest(), size
            except httpx.TransportError:
                if attempt < 5:
                    time.sleep(4 * (attempt + 1))
        raise RuntimeError(f"giving up on {url}")
    finally:
        partial.unlink(missing_ok=True)


def sia_row(client: httpx.Client, exp: Exposure) -> tuple[dict[str, Any], str, str]:
    """One SIA2 row for the exposure. Returns (row, request_url, status)."""
    url = f"{SIA}?COLLECTION={exp.collection}&POS=circle+{CENTER_RA}+{CENTER_DEC}+0.01&MAXREC=2000"
    r = get(client, url)
    root = ET.fromstring(r.content)
    statuses = [
        info.attrib.get("value", "")
        for resource in root.iter()
        if resource.tag.rsplit("}", 1)[-1] == "RESOURCE" and resource.get("type") == "results"
        for info in resource.iter()
        if info.tag.rsplit("}", 1)[-1] == "INFO" and info.get("name") == "QUERY_STATUS"
    ]
    if not statuses or any(status != "OK" for status in statuses):
        raise RuntimeError(f"SIA QUERY_STATUS: {statuses or 'missing'}")
    table = parse_single_table(io.BytesIO(r.content))
    rows = table.to_table(use_names_over_ids=True)
    hit = [row for row in rows if str(row["obs_publisher_did"]) == exp.publisher_did]
    if len(hit) != 1:
        raise RuntimeError(f"expected 1 SIA row for {exp.publisher_did}, got {len(hit)}")
    row = {name: hit[0][name] for name in rows.colnames}
    return row, url, statuses[-1]


def s3_versions(client: httpx.Client, release: str, detector: int) -> list[str]:
    """Published Spectral WCS directories for a release/detector (evidence for the link rule)."""
    out: set[str] = set()
    url = f"{S3}/?list-type=2&prefix={release}/spectral_wcs/&delimiter=/"
    root = ET.fromstring(get(client, url).content)
    ns = {"s": root.tag.split("}")[0].strip("{")}
    for p in root.findall("s:CommonPrefixes/s:Prefix", ns):
        out.add(p.text or "")
    return sorted(out)


def image_hdu(hdus: fits.HDUList, name: str) -> fits.ImageHDU | fits.PrimaryHDU:
    hdu = hdus[name]
    if not isinstance(hdu, (fits.ImageHDU, fits.PrimaryHDU)) or hdu.data is None:
        raise RuntimeError(f"{name} is not a populated image HDU")
    return hdu


def image_data(hdus: fits.HDUList, name: str) -> np.ndarray:
    data = image_hdu(hdus, name).data
    if not isinstance(data, np.ndarray):
        raise RuntimeError(f"{name} has no image array")
    return data


def header_unit(header: fits.Header) -> str | None:
    value = header.get("BUNIT")
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise RuntimeError("BUNIT is not a string")
    return value


def table_hdu(hdus: fits.HDUList, name: str) -> fits.BinTableHDU:
    hdu = hdus[name]
    if not isinstance(hdu, fits.BinTableHDU) or hdu.data is None:
        raise RuntimeError(f"{name} is not a populated binary table HDU")
    return hdu


def header_number(header: fits.Header, key: str) -> float:
    value = header[key]
    if not isinstance(value, (int, float)):
        raise RuntimeError(f"{key} is not numeric: {value!r}")
    return float(value)


def native_offset(cut_hdr: fits.Header) -> tuple[int, int]:
    """Origin (0-based, native active pixel) of the cutout from its linear WCS 'A'.

    WCS A is documented as '0-based active pixel coordinates': world = pix - CRPIX_A (FITS 1-based
    cutout pixel). The first cutout pixel (index 0, FITS pixel 1) is therefore native 0-based
    index 1 - CRPIXA.
    """
    for k in ("CTYPE1A", "CTYPE2A"):
        if cut_hdr[k] != "LINEAR":
            raise RuntimeError(f"unexpected {k}={cut_hdr[k]}")
    x0 = 1 - header_number(cut_hdr, "CRPIX1A") + header_number(cut_hdr, "CRVAL1A")
    y0 = 1 - header_number(cut_hdr, "CRPIX2A") + header_number(cut_hdr, "CRVAL2A")
    if x0 != int(x0) or y0 != int(y0):
        raise RuntimeError("non-integer native offset")
    return int(x0), int(y0)


def iso_z(s: str) -> str:
    return s if s.endswith("Z") else s + "Z"


def history_calibs(hdr: fits.Header) -> list[dict[str, str]]:
    seen: list[dict[str, str]] = []
    history = hdr.get("HISTORY", [])
    if history is None:
        raise RuntimeError("HISTORY is null")
    for line in history:
        m = re.match(r"\[CALIB\]\s+(\S+)\s+([0-9a-f-]{36})", str(line))
        if m and {"kind": m[1], "uuid": m[2]} not in seen:
            seen.append({"kind": m[1], "uuid": m[2]})
    return seen


def write_calibration_extract(
    cal_path: Path, dest: Path, x0: int, y0: int, nx: int, ny: int, parent_sha: str, parent_key: str
) -> tuple[np.ndarray, np.ndarray]:
    """CWAVE/CBAND window for the native box, with its link to the parent file in the header."""
    with fits.open(cal_path, memmap=True) as h:
        cw, cb = image_hdu(h, "CWAVE"), image_hdu(h, "CBAND")
        cw_data, cb_data = image_data(h, "CWAVE"), image_data(h, "CBAND")
        if cw_data.shape != (2040, 2040) or cb_data.shape != (2040, 2040):
            raise RuntimeError(f"unexpected calibration shape {cw_data.shape}")
        cwave = np.array(cw_data[y0 : y0 + ny, x0 : x0 + nx], dtype=np.float64)
        cband = np.array(cb_data[y0 : y0 + ny, x0 : x0 + nx], dtype=np.float64)
        units = (cw.header.get("BUNIT", "um"), cb.header.get("BUNIT", "um"))
    primary = fits.PrimaryHDU()
    primary.header["COMMENT"] = "CWAVE/CBAND window cut from the official SPHEREx Spectral WCS file."
    primary.header["PARENTKY"] = parent_key[-68:]
    primary.header["PARENTSH"] = parent_sha[:60]
    primary.header["PARENTS2"] = (parent_sha[60:], "parent sha256 hex 61-64")
    hdus: list[fits.PrimaryHDU | fits.ImageHDU] = [primary]
    for name, arr, unit in (("CWAVE", cwave, units[0]), ("CBAND", cband, units[1])):
        hdu = fits.ImageHDU(arr, name=name)
        hdu.header["BUNIT"] = unit
        hdu.header["NATIVEX0"] = (x0, "native 0-based x of col 0")
        hdu.header["NATIVEY0"] = (y0, "native 0-based y of row 0")
        hdus.append(hdu)
    dest.parent.mkdir(parents=True, exist_ok=True)
    fits.HDUList(hdus).writeto(dest, overwrite=True)
    return cwave, cband


def load_checker() -> ModuleType:
    spec = importlib.util.spec_from_file_location("check_contracts", ROOT / "scripts" / "check_contracts.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load contract checker")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["check_contracts"] = mod
    spec.loader.exec_module(mod)
    return mod


def sha_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def lambda_at_native_pixel(window_path: Path | str, x: float, y: float) -> dict[str, Any]:
    """Read CWAVE/CBAND without interpolation at floor(v + 0.5), ties upward.

    Native coordinates are 0-based: x is column, y is row. The rounded pixel
    indexes each window as [y - NATIVEY0, x - NATIVEX0]. Its manifest is required.
    This function performs no network access, recovery, or writes.
    """
    if not math.isfinite(x) or not math.isfinite(y):
        raise ValueError("native pixel coordinates must be finite")
    path = Path(window_path).resolve()
    package = next((p for p in path.parents if (p / "package-manifest.json").is_file()), None)
    if package is None:
        raise RuntimeError(f"no package-manifest.json found for window: {path}")
    manifest = json.loads((package / "package-manifest.json").read_text(encoding="utf-8"))
    assets = [a for a in manifest["assets"] if a["role"] == "calibration_extract"
              and a["path"] == path.relative_to(package).as_posix()]
    if len(assets) != 1:
        raise RuntimeError(f"expected one calibration window in manifest: {path}")
    asset = assets[0]
    actual_sha = sha_file(path)
    if actual_sha != asset["sha256"]:
        raise RuntimeError(f"window checksum mismatch: {path}")
    observations = [o for o in manifest["observations"] if any(
        p["product_id"] == asset["product_id"] for p in o["products"]["calibrations"])]
    if len(observations) != 1:
        raise RuntimeError(f"expected one observation linked to window: {path}")
    ix, iy = math.floor(x + 0.5), math.floor(y + 0.5)
    values: dict[str, float] = {}
    with fits.open(path, memmap=False) as hdus:
        for ext in ("CWAVE", "CBAND"):
            hdu = image_hdu(hdus, ext)
            data = image_data(hdus, ext)
            col = ix - int(header_number(hdu.header, "NATIVEX0"))
            row = iy - int(header_number(hdu.header, "NATIVEY0"))
            if data.ndim != 2 or not (0 <= row < data.shape[0] and 0 <= col < data.shape[1]):
                raise ValueError(f"native pixel ({ix}, {iy}) outside {ext} window: {path}")
            if hdu.header.get("BUNIT") not in ("um", "micron", "microns", "µm"):
                raise RuntimeError(f"{ext} window unit must be micrometres")
            value = float(data[row, col])
            if not math.isfinite(value):
                raise ValueError(f"{ext} at native pixel ({ix}, {iy}) must be finite")
            values[ext] = value
    return {
        "requested_pixel": {"x": x, "y": y},
        "native_pixel": {"x": ix, "y": iy},
        "rounding_method": "floor(v + 0.5); nearest integer, ties upward; no interpolation",
        "cwave_um": values["CWAVE"], "cband_um": values["CBAND"],
        "observation_id": observations[0]["observation_id"],
        "product_id": asset["product_id"],
        "window_path": str(path), "window_sha256": actual_sha,
    }


def package_lambda(package: Path, observation_id: str, x: float, y: float) -> dict[str, Any]:
    """Select a calibration by observation identity, never by asset ordering."""
    manifest = json.loads((package / "package-manifest.json").read_text(encoding="utf-8"))
    observations = [o for o in manifest["observations"] if o["observation_id"] == observation_id]
    if len(observations) != 1:
        raise ValueError(f"expected one observation for {observation_id}")
    pids = {p["product_id"] for p in observations[0]["products"]["calibrations"]}
    windows = [a for a in manifest["assets"] if a["role"] == "calibration_extract" and a["product_id"] in pids]
    if len(windows) != 1:
        raise RuntimeError(f"expected one calibration window for {observation_id}")
    path = (package / windows[0]["path"]).resolve()
    if not path.is_relative_to(package.resolve()):
        raise ValueError("calibration window escapes package")
    return lambda_at_native_pixel(path, x, y)


# Snapshot checksums from the supplied package-manifest.json (2026-11-15 UTC).
# Keep independent of --out so a new recipient can regenerate without a local manifest.
RAW_SHA256 = {
    EXPOSURES[0].key: "768aeb49a6fae74800631bb480dc4524f020b59eb5437f8bf4032bffc3244e9e",
    EXPOSURES[1].key: "90625279f33ca0e046d3b6adc35e3e49b53e4f648b97c79d794b9f4135ed2968",
    **{exp.calibration_key: "51750c8f948a30541d391e54930279aa067c62c398a7cc2679e592bc6044427a" for exp in EXPOSURES},
}

PACKAGE_README = """# Epsilon Indi B D3 — paquete de validación / validation package

## Español
Contiene dos recortes FITS reales, dos ventanas CWAVE/CBAND, manifiesto y link-report.json.
Los FITS no se commitean: cada destinatario regenera y verifica su copia.
Desde la raíz del repositorio, regenerar (requiere red):
`uv run --locked --script scripts/build-validation-package.py`
Verificar sin red y sin modificar el manifiesto:
`uv run --locked --script scripts/build-validation-package.py --verify`
Otra ubicación: añadir `--out DIR` al generar o `--package DIR` al verificar.
Originales y calibración: `data/raw/spherex-originals/`; reutilizar con `--raw DIR`.
El par sigue siendo CANDIDATO: este paquete no demuestra comparabilidad científica.
Falta el contenido del caso (Sebastián); completeness=unverified y offline=incomplete.
IDs aceptados por Sebastián: case_ref=eps-indi-b-d3-pair; region_id=eps-indi-b-d3-cutout-box, revisión 1.
λ del centro (`spectral.local`) es solo referencia de la región.
Medición: leer CWAVE/CBAND en el píxel nativo entero más cercano al centroide de cada época.
Sin interpolar; registrar píxel y método: floor(v + 0.5), empates hacia arriba.
Consultar sin red: `uv run --locked --script scripts/build-validation-package.py --lambda-at --package DIR --epoch A --x 793 --y 1146`
Para B: `--epoch B --x 195 --y 1184`; también acepta `--observation-id ID` en vez de `--epoch`.
Fuente y procedencia por imagen: package-manifest.json; evidencia de vínculos: link-report.json.

## English
Contains two real FITS cutouts, two CWAVE/CBAND windows, manifest and link-report.json.
FITS files are not committed: each recipient regenerates and verifies their own copy.
From the repository root, regenerate (network required):
`uv run --locked --script scripts/build-validation-package.py`
Verify offline without modifying the manifest:
`uv run --locked --script scripts/build-validation-package.py --verify`
Custom location: add `--out DIR` to build or `--package DIR` to verify.
Originals and calibration: `data/raw/spherex-originals/`; reuse with `--raw DIR`.
The pair remains a CANDIDATE: this package does not establish scientific comparability.
Case content (Sebastián) is missing; completeness=unverified and offline=incomplete.
IDs accepted by Sebastián: case_ref=eps-indi-b-d3-pair; region_id=eps-indi-b-d3-cutout-box, revision 1.
Centre λ (`spectral.local`) is only a region reference.
Measurement: read CWAVE/CBAND at the nearest integer native pixel to each epoch's measured centroid.
No interpolation; record pixel and method: floor(v + 0.5), ties upward.
Query offline: `uv run --locked --script scripts/build-validation-package.py --lambda-at --package DIR --epoch A --x 793 --y 1146`
For B: `--epoch B --x 195 --y 1184`; `--observation-id ID` can replace `--epoch`.
Per-image sources: package-manifest.json; link evidence: link-report.json.
"""


def validate_manifest(manifest: dict[str, Any]) -> list[str]:
    cc = load_checker()
    from jsonschema import Draft202012Validator
    from referencing import Registry, Resource

    schemas = {}
    for path in sorted((ROOT / "contracts").glob("*.schema.json")):
        schema = json.loads(path.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        schemas[schema["$id"]] = schema
    registry = Registry().with_resources((sid, Resource.from_contents(s)) for sid, s in schemas.items())
    validator = Draft202012Validator(schemas[cc.MANIFEST_ID], registry=registry)
    errors = [f"{'/'.join(map(str, e.absolute_path)) or '/'}: {e.message}" for e in validator.iter_errors(manifest)]
    return errors or cc.semantic_manifest(manifest)


def verify_package(package: Path) -> int:
    """Recover interrupted publication, then check contracts/assets without editing the manifest."""
    recover_package(package)
    manifest = json.loads((package / "package-manifest.json").read_text(encoding="utf-8"))
    failures = validate_manifest(manifest)
    if not failures:
        for asset in manifest["assets"]:
            path = (package / asset["path"]).resolve()
            if not path.is_relative_to(package.resolve()):
                failures.append(f"asset escapes package: {asset['path']}")
            elif not path.is_file() or path.stat().st_size != asset["bytes"] or sha_file(path) != asset["sha256"]:
                failures.append(f"asset check failed: {asset['path']}")
    for failure in failures:
        print(" -", failure)
    if failures:
        return 1
    print(f"OK: manifest valid; {len(manifest['assets'])} assets verified offline; manifest unchanged")
    return 0


def code_provenance() -> tuple[str | None, list[dict[str, str]]]:
    """A commit identifies the script only if its tracked bytes match HEAD."""
    def git(*args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(["git", *args], capture_output=True, text=True, cwd=ROOT)

    base_result = git("rev-parse", "HEAD")
    base = base_result.stdout.strip()
    if base_result.returncode or re.fullmatch(r"[0-9a-f]{7,40}", base) is None:
        base = "unknown"
    status = git("status", "--porcelain", "--untracked-files=no")
    dirty = "unknown" if status.returncode else str(bool(status.stdout)).lower()
    script = Path(__file__).resolve()
    relative = script.relative_to(ROOT).as_posix()
    tracked = git("ls-files", "--error-unmatch", "--", relative).returncode == 0
    unchanged = tracked and git("diff", "--quiet", "HEAD", "--", relative).returncode == 0
    software = [
        {"name": relative + ":sha256", "version": sha_file(script)},
        {"name": "git:base_commit", "version": base},
        {"name": "git:dirty", "version": dirty},
        {"name": "git:script_tracked", "version": str(tracked).lower()},
    ]
    return base if unchanged and base != "unknown" else None, software


def calibration_link(original: Path, calibration: Path) -> dict[str, Any]:
    with fits.open(original, memmap=True) as image, fits.open(calibration, memmap=True) as cal:
        a, b = table_hdu(image, "WCS-WAVE").data, table_hdu(cal, "WCS-WAVE").data
        identical = a.dtype == b.dtype and a.shape == b.shape and a.tobytes() == b.tobytes()
    if not identical:
        raise RuntimeError(f"WCS-WAVE mismatch: {original.name} / {calibration.name}")
    return {"extension": "WCS-WAVE", "byte_identical": True, "calibration_sha256": sha_file(calibration)}


def recover_package(target: Path) -> None:
    """Recover a stopped single-writer build; ambiguous backups require human selection."""
    target = target.resolve()
    previous = sorted(target.parent.glob(f".{target.name}-previous-*"))
    if not target.exists() and len(previous) > 1:
        raise RuntimeError(
            f"multiple previous packages for {target}; manually restore one to {target} "
            f"and move the other backups aside before retrying: {previous}"
        )
    if not target.exists() and previous:
        backup = previous[0]
        if backup.is_symlink() or not backup.is_dir():
            raise RuntimeError(f"cannot restore non-directory or symlink backup: {backup}")
        os.replace(backup, target)
        print(f"Recovered previous package: {target}")
    for orphan in sorted(target.parent.glob(f".{target.name}-build-*")):
        if orphan.is_symlink() or orphan.resolve().parent != target.parent or not orphan.is_dir():
            raise RuntimeError(f"refusing to remove unsafe build path: {orphan}")
        shutil.rmtree(orphan)


def publish_package(staged: Path, target: Path) -> None:
    """Publish only a validated tree, restoring the old directory if rename fails.

    Windows cannot atomically replace a nonempty directory. Each rename is atomic,
    but replacement has a brief absent-path interval; this is not crash-atomic.
    """
    if not target.exists():
        os.replace(staged, target)
        return
    # Reserve a unique sibling name without leaving an empty destination directory.
    backup = Path(tempfile.mkdtemp(prefix=f".{target.name}-previous-", dir=target.parent))
    backup.rmdir()
    os.replace(target, backup)
    try:
        os.replace(staged, target)
    except BaseException:
        os.replace(backup, target)
        raise
    try:
        shutil.rmtree(backup)
    except OSError as exc:
        # Publication already committed; keep the previous copy if cleanup is blocked.
        print(f"Published; previous copy retained at {backup}: {exc}", file=sys.stderr)


def build_package(out: Path, raw: Path) -> int:
    failures: list[str] = []
    sources: list[dict[str, str]] = []
    observations: list[dict[str, Any]] = []
    assets: list[dict[str, Any]] = []
    report: dict[str, Any] = {"exposures": {}}

    with httpx.Client(timeout=httpx.Timeout(300.0, connect=30.0), follow_redirects=True) as client:
        # --- calibration files: DR1 and QR3 copies, must be byte-identical ---
        cal_info: dict[str, dict[str, Any]] = {}
        for exp in EXPOSURES:
            versions = s3_versions(client, exp.release, exp.detector)
            sources.append(
                {
                    "service": "spherex_s3",
                    "request": f"{S3}/?list-type=2&prefix={exp.release}/spectral_wcs/&delimiter=/",
                    "retrieved_at": utc_now(),
                    "status": "HTTP 200; versions: " + ", ".join(versions),
                }
            )
            if len(versions) != 1:
                failures.append(f"{exp.release}: {len(versions)} Spectral WCS versions published; link is ambiguous")
            cal_url = f"{S3}/{exp.calibration_key}"
            dest = raw / exp.calibration_key.replace("/", "_")
            reused = dest.exists()
            sha, size = download(client, cal_url, dest, RAW_SHA256[exp.calibration_key])
            sources.append(
                {"service": "spherex_s3", "request": cal_url, "retrieved_at": utc_now(), "status": f"{'local reuse; sha256 verified' if reused else 'HTTP 200'}; {size} bytes"}
            )
            cal_info[exp.release] = {"path": dest, "sha": sha, "bytes": size, "url": cal_url, "versions": versions}
        if cal_info["dr1"]["sha"] != cal_info["qr3"]["sha"]:
            failures.append("DR1 and QR3 Spectral WCS differ; they cannot share one calibration product")

        for exp in EXPOSURES:
            print(f"[{exp.label}] {exp.observation_id}")
            row, sia_url, sia_status = sia_row(client, exp)
            sources.append(
                {"service": "irsa_sia2", "request": sia_url, "retrieved_at": utc_now(), "status": sia_status}
            )
            orig_url = f"{IBE}/{exp.key}"
            orig_path = raw / exp.key.replace("/", "_")
            reused = orig_path.exists()
            osha, obytes = download(client, orig_url, orig_path, RAW_SHA256[exp.key])
            sources.append(
                {"service": "irsa_browse", "request": orig_url, "retrieved_at": utc_now(), "status": f"{'local reuse; sha256 verified' if reused else 'HTTP 200'}; {obytes} bytes"}
            )
            cut_url = f"{orig_url}?center={CENTER_RA},{CENTER_DEC}&size={SIZE_DEG}"
            cut_rel = f"native_cutouts/{exp.filename.replace('.fits', f'_cutout_{SIZE_DEG}deg.fits')}"
            cut_path = out / cut_rel
            csha, cbytes = download(client, cut_url, cut_path)
            executed_at = utc_now()
            sources.append(
                {"service": "irsa_cutout", "request": cut_url, "retrieved_at": executed_at, "status": f"HTTP 200; {cbytes} bytes"}
            )

            calibration_evidence = calibration_link(orig_path, cal_info[exp.release]["path"])

            # --- pixel link proof ---
            with fits.open(orig_path, memmap=True) as ho, fits.open(cut_path) as hc:
                x0, y0 = native_offset(image_hdu(hc, "IMAGE").header)
                ny, nx = image_data(hc, "IMAGE").shape
                link: dict[str, bool] = {}
                for ext in ("IMAGE", "FLAGS", "VARIANCE", "ZODI"):
                    sub = np.asarray(image_data(ho, ext)[y0 : y0 + ny, x0 : x0 + nx])
                    link[ext] = bool(np.array_equal(sub, image_data(hc, ext), equal_nan=True))
                    if not link[ext]:
                        failures.append(f"{exp.label}: {ext} of the cutout differs from the original sub-array")
                # same celestial position at the same native pixel
                w_cut, w_orig = WCS(image_hdu(hc, "IMAGE").header), WCS(image_hdu(ho, "IMAGE").header)
                p_cut = w_cut.all_world2pix([[CENTER_RA, CENTER_DEC]], 0)[0]
                p_orig = w_orig.all_world2pix([[CENTER_RA, CENTER_DEC]], 0)[0]
                wcs_dx = float(p_cut[0] + x0 - p_orig[0])
                wcs_dy = float(p_cut[1] + y0 - p_orig[1])
                if abs(wcs_dx) > 1e-3 or abs(wcs_dy) > 1e-3:
                    failures.append(f"{exp.label}: WCS offset disagrees with data link ({wcs_dx:.4g}, {wcs_dy:.4g}) px")
                ih = image_hdu(ho, "IMAGE").header
                info = image_hdu(ho, "IMAGE").fileinfo()
                if info is None:
                    raise RuntimeError("original IMAGE has no file offsets")
                hdr_bytes = f"{info['hdrLoc']}-{info['datLoc'] - 1}"
                bunits = {e: header_unit(image_hdu(ho, e).header) for e in ("IMAGE", "VARIANCE", "ZODI")}
                calib = history_calibs(ih)
                time_vals = {k: ih[k] for k in ("DATE-BEG", "DATE-AVG", "DATE-END", "MJD-BEG", "MJD-AVG", "MJD-END")}
                tsys = ih["TIMESYS"]
                xposure = header_number(ih, "XPOSURE")
                assess = (ih.get("L1DQAFLG"), ih.get("L2DQAFLG"), int(header_number(ih, "FINAST")))
                obsid_hdr = str(ih["OBSID"])
                det_hdr = int(header_number(ih, "DETECTOR"))
                flags_in_box = int(np.bitwise_or.reduce(np.asarray(image_data(hc, "FLAGS"), dtype=np.int64).ravel()))
            if obsid_hdr != exp.obs_id or det_hdr != exp.detector:
                failures.append(f"{exp.label}: header OBSID/DETECTOR {obsid_hdr}/{det_hdr} do not match file name")
            if tsys != "UTC":
                failures.append(f"{exp.label}: TIMESYS={tsys}")

            # --- calibration window + local wavelength at the region centre ---
            cal = cal_info[exp.release]
            cal_rel = f"calibration_extracts/spectral_wcs_D{exp.detector}_{exp.release}_{exp.obs_id}_window.fits"
            cwave, cband = write_calibration_extract(
                cal["path"], out / cal_rel, x0, y0, nx, ny, cal["sha"], exp.calibration_key
            )
            px, py = float(p_orig[0]), float(p_orig[1])
            ix, iy = round(px), round(py)
            central_um = float(cwave[iy - y0, ix - x0])
            band_um = float(cband[iy - y0, ix - x0])
            report["exposures"][exp.label] = {
                "observation_id": exp.observation_id,
                "t_mid_utc": time_vals["DATE-AVG"],
                "native_box_0based": {"x0": x0, "y0": y0, "nx": nx, "ny": ny},
                "link_identical": link,
                "calibration_link": calibration_evidence,
                "wcs_offset_px": [wcs_dx, wcs_dy],
                "target_native_pixel": [px, py],
                "cwave_um": central_um,
                "cband_um": band_um,
                "flags_or_in_box": flags_in_box,
                "original_sha256": osha,
                "cutout_sha256": csha,
            }

            native_pid = f"spherex-file:{exp.key}"
            cal_pid = f"spherex-file:{exp.calibration_key}"
            derived_pid = f"derived:{csha}"
            native_ref = {
                "product_id": native_pid,
                "uri": orig_url,
                "format": "image/fits",
                "filename": exp.filename,
                "version": "l2b-v27",
                "processing_date": exp.proc[-8:],
                "sha256": osha,
            }
            cal_ref = {
                "product_id": cal_pid,
                "uri": cal["url"],
                "format": "image/fits",
                "filename": exp.calibration_key.rsplit("/", 1)[-1],
                "version": "cal-swcs-v5",
                "processing_date": "2026-191",
                "sha256": cal["sha"],
            }
            hdr_ref = f"{native_pid}#bytes={hdr_bytes}"
            def q(ext: str, unit: str | None) -> dict[str, str | None]:
                return {"product_id": native_pid, "extname": ext, "unit": unit}
            t_start, t_end = float(row["t_min"]), float(row["t_max"])
            obs = {
                "schema_version": "0.1-draft",
                "observation_id": exp.observation_id,
                "identity_status": "resolved",
                "mission": "SPHEREx",
                "instrument": "SPHEREx",
                "source": {
                    "collection": exp.collection,
                    "archive_collection": str(row["obs_collection"]),
                    "obs_id": exp.obs_id,
                    "publisher_did": exp.publisher_did,
                    "acquisition_id": obsid_hdr,
                },
                "detector": exp.detector,
                "product_type": "image",
                "product_subtype": "science",
                "calibration_level": 2,
                "region_refs": ["eps-indi-b-d3-cutout-box"],
                "time": {
                    "samples": [
                        {"role": "start", "value": t_start, "format": "MJD", "scale": None, "reference_position": None, "source_locator": "sia:t_min"},
                        {"role": "end", "value": t_end, "format": "MJD", "scale": None, "reference_position": None, "source_locator": "sia:t_max"},
                        {"role": "start", "value": time_vals["DATE-BEG"], "format": "ISO8601", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:DATE-BEG"},
                        {"role": "midpoint", "value": time_vals["DATE-AVG"], "format": "ISO8601", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:DATE-AVG"},
                        {"role": "end", "value": time_vals["DATE-END"], "format": "ISO8601", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:DATE-END"},
                        {"role": "start", "value": header_number(ih, "MJD-BEG"), "format": "MJD", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:MJD-BEG"},
                        {"role": "midpoint", "value": header_number(ih, "MJD-AVG"), "format": "MJD", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:MJD-AVG"},
                        {"role": "end", "value": header_number(ih, "MJD-END"), "format": "MJD", "scale": tsys, "reference_position": None, "source_locator": "fits:IMAGE:MJD-END"},
                    ],
                    "exposure_s": xposure,
                    "release_date": str(row["obs_release_date"]),
                },
                "coverage": {
                    "center": {"ra_deg": float(row["s_ra"]), "dec_deg": float(row["s_dec"]), "frame": "ICRS"},
                    "footprint": {"value": str(row["s_region"]), "format": "stc-s", "frame": "ICRS"},
                },
                "spatial_wcs": {"product_id": native_pid, "hdu": "IMAGE", "header_ref": hdr_ref},
                "spectral": {
                    "search_range_m": {"min": float(row["em_min"]), "max": float(row["em_max"])},
                    "local": {
                        "sky_position": {"ra_deg": CENTER_RA, "dec_deg": CENTER_DEC, "frame": "ICRS"},
                        "original_pixel": {"x": round(px, 3), "y": round(py, 3), "origin": 0},
                        "central_um": central_um,
                        "bandwidth_um": band_um,
                        "method": "cwave_cband",
                        "resources": [
                            {"product_id": cal_pid, "extname": "CWAVE", "unit": "um"},
                            {"product_id": cal_pid, "extname": "CBAND", "unit": "um"},
                        ],
                        "transform_ref": None,
                    },
                },
                "quality": {
                    "flags": q("FLAGS", None),
                    "variance": q("VARIANCE", bunits["VARIANCE"]),
                    "pipeline_assessment": {
                        "l1_dqa": assess[0],
                        "l2_dqa": assess[1],
                        "fine_astrometry": assess[2],
                        "source_locator": "fits:IMAGE:L1DQAFLG,L2DQAFLG,FINAST",
                    },
                    "review_ref": None,
                },
                "ancillary": [q("ZODI", bunits["ZODI"]), q("EPSF", None), q("WCS-WAVE", None)],
                "products": {
                    "native": native_ref,
                    "calibrations": [cal_ref],
                    "derived": [
                        {
                            "asset": {
                                "product_id": derived_pid,
                                "uri": cut_url,
                                "format": "image/fits",
                                "filename": Path(cut_rel).name,
                                "version": "l2b-v27",
                                "processing_date": exp.proc[-8:],
                                "sha256": csha,
                            },
                            "parent_product_ids": [native_pid],
                            "transformations": [
                                {
                                    "operation": "cutout",
                                    "method": "IRSA IBE server-side rectangular cutout; extensions IMAGE, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE; pixel values unmodified",
                                    "software": {"name": "IRSA IBE cutout service", "version": "unversioned"},
                                    "parameters": {
                                        "center_ra_deg": CENTER_RA,
                                        "center_dec_deg": CENTER_DEC,
                                        "size_deg": SIZE_DEG,
                                        "native_x0_0based": x0,
                                        "native_y0_0based": y0,
                                        "nx_px": nx,
                                        "ny_px": ny,
                                        "link_rule": "native_index = cutout_index + (x0, y0) (0-based [row, col] = [y, x])",
                                        "pixel_identical_to_original": {k: v for k, v in link.items()},
                                    },
                                    "executed_at": executed_at,
                                    "evidence_ref": f"{cut_rel}; verified by scripts/build-validation-package.py (array_equal against the original)",
                                }
                            ],
                            "wcs_ref": "fits:IMAGE:CRPIX/CRVAL/PC/SIP (TAN-SIP, CRPIX shifted) and fits:IMAGE:WCSNAMEA=0-based active pixel coordinates (native offset)",
                            "quality_refs": [
                                {"product_id": derived_pid, "extname": "FLAGS", "unit": None},
                                {"product_id": derived_pid, "extname": "VARIANCE", "unit": bunits["VARIANCE"]},
                            ],
                            "scientific_unit": bunits["IMAGE"],
                        }
                    ],
                    "display": [],
                },
                "metadata_stage": "calibration_linked",
                "availability": {"native": "reachable", "prepared": "available", "display": "not_prepared", "offline": "incomplete"},
                "issues": [],
                "provenance": {
                    "query_uri": sia_url,
                    "retrieved_at": executed_at,
                    "raw_metadata_ref": hdr_ref,
                    "calibration_history": calib,
                    "field_sources": [
                        {
                            "paths": ["/instrument", "/source/archive_collection", "/source/publisher_did", "/product_type", "/product_subtype", "/calibration_level", "/coverage", "/spectral/search_range_m", "/time/release_date", "/products/native/uri", "/products/native/format"],
                            "kind": "sia",
                            "reference": sia_url,
                            "locator": "columns obs_collection, obs_publisher_did, s_ra, s_dec, s_region, em_min, em_max, obs_release_date, t_min, t_max, access_url",
                        },
                        {
                            "paths": ["/source/acquisition_id", "/detector", "/time/exposure_s", "/spatial_wcs", "/quality", "/ancillary", "/provenance/calibration_history"],
                            "kind": "fits_header",
                            "reference": hdr_ref,
                            "locator": "IMAGE header: OBSID, DETECTOR, XPOSURE, DATE-*, MJD-*, TIMESYS, L1DQAFLG, L2DQAFLG, FINAST, HISTORY [CALIB]; BUNIT of IMAGE/VARIANCE/ZODI",
                        },
                        {
                            "paths": ["/observation_id", "/products/native/product_id", "/products/native/filename", "/products/native/version", "/products/native/processing_date", "/products/native/sha256", "/products/derived"],
                            "kind": "derivation",
                            "reference": "docs/specs/0001-arquitectura-observation.md#31-identidad-y-significado",
                            "locator": "ID rule on the archive key; sha256 computed locally after download; cutout offset from WCS A and checked with numpy.array_equal against the original",
                        },
                        {
                            "paths": ["/spectral/local", "/products/calibrations"],
                            "kind": "calibration",
                            "reference": cal["url"],
                            "locator": f"pixel from IMAGE TAN-SIP WCS (astropy {astropy.__version__} all_world2pix, origin 0); CWAVE/CBAND read at nearest native pixel ({ix},{iy}); link rule: {exp.release} publishes exactly one Spectral WCS version {cal['versions']} and DR1/QR3 copies are byte-identical (sha256 equal); this image WCS-WAVE table is byte-identical to the linked calibration",
                        },
                    ],
                },
            }
            observations.append(obs)
            assets.append({"path": cut_rel, "sha256": csha, "bytes": cbytes, "media_type": "image/fits", "product_id": derived_pid, "role": "native_cutout"})
            assets.append(
                {"path": cal_rel, "sha256": sha_file(out / cal_rel), "bytes": (out / cal_rel).stat().st_size, "media_type": "image/fits", "product_id": cal_pid, "role": "calibration_extract"}
            )

    # --- manifest ---
    commit, software = code_provenance()
    manifest = {
        "schema_version": "0.1-draft",
        "package_id": "eps-indi-b-d3-pair",
        "package_version": 1,
        "content_origin": "irsa_snapshot",
        "prepared_at": utc_now(),
        "prepared_with": {
            "software": [
                {"name": "astropy", "version": astropy.__version__},
                {"name": "numpy", "version": np.__version__},
                {"name": "httpx", "version": httpx.__version__},
                *software,
            ],
            "repository_commit": commit or None,
        },
        "sources": sources,
        "cases": [
            {
                "case_ref": "eps-indi-b-d3-pair",
                "region_ref": {"region_id": "eps-indi-b-d3-cutout-box", "revision": 1},
                "observation_ids": [o["observation_id"] for o in observations],
                "analysis_refs": [],
            }
        ],
        "observations": observations,
        "assets": assets,
        "completeness": {"status": "unverified", "verified_at": None, "missing": []},
        "acknowledgements": [ACK],
    }

    # --- verify: re-hash every asset from disk, then validate against the contracts ---
    for a in assets:
        p = out / a["path"]
        if not p.is_file() or sha_file(p) != a["sha256"] or p.stat().st_size != a["bytes"]:
            failures.append(f"asset check failed: {a['path']}")
    failures += validate_manifest(manifest)

    out.mkdir(parents=True, exist_ok=True)
    (out / "package-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    (out / "link-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    (out / "README.md").write_text(PACKAGE_README, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2))
    print(f"\nmanifest: {out / 'package-manifest.json'}")
    if failures:
        print("\nFAILED:")
        for f in failures:
            print(" -", f)
        return 1
    print("\nOK: manifest valid, every asset re-hashed, cutout pixels identical to the originals")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    default = ROOT / "data" / "packages" / "eps-indi-b-d3"
    ap.add_argument("--out", type=Path, default=default)
    ap.add_argument("--raw", type=Path, default=ROOT / "data" / "raw" / "spherex-originals")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--verify", action="store_true", help="recover publication, then check assets and contracts offline")
    mode.add_argument("--lambda-at", action="store_true", help="read CWAVE/CBAND at a native pixel offline")
    ap.add_argument("--package", type=Path, help="package for --verify or --lambda-at")
    selector = ap.add_mutually_exclusive_group()
    selector.add_argument("--epoch", choices=("A", "B"))
    selector.add_argument("--observation-id")
    ap.add_argument("--x", type=float)
    ap.add_argument("--y", type=float)
    args = ap.parse_args()
    if args.package is not None and not (args.verify or args.lambda_at):
        ap.error("--package requires --verify or --lambda-at")
    if args.lambda_at and (args.x is None or args.y is None or not (args.epoch or args.observation_id)):
        ap.error("--lambda-at requires --x, --y and --epoch or --observation-id")
    if not args.lambda_at and any(v is not None for v in (args.x, args.y, args.epoch, args.observation_id)):
        ap.error("--x, --y, --epoch and --observation-id require --lambda-at")
    try:
        if args.lambda_at:
            observation_id = args.observation_id
            if args.epoch:
                observation_id = next(e.observation_id for e in EXPOSURES if e.label == args.epoch)
            print(json.dumps(package_lambda(args.package or args.out, observation_id, args.x, args.y), indent=2))
            return 0
        if args.verify:
            return verify_package(args.package or args.out)
        target = args.out.resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        recover_package(target)
        with tempfile.TemporaryDirectory(prefix=f".{target.name}-build-", dir=target.parent) as name:
            staged = Path(name) / "package"
            staged.mkdir()
            if build_package(staged, args.raw) != 0 or verify_package(staged) != 0:
                return 1
            publish_package(staged, target)
        print(f"Published: {target}")
        return 0
    except (OSError, ValueError, RuntimeError, httpx.HTTPError, ET.ParseError) as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
