# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["pytest==9.2.0", "astropy==8.0.2", "numpy==2.5.4", "httpx==0.28.1", "jsonschema==4.26.0"]
# ///
"""Run with uv run --script tests/test_build_validation_package.py (offline tests)."""

import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from astropy.io import fits

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build-validation-package.py"
spec = importlib.util.spec_from_file_location("validation_package", SCRIPT)
assert spec is not None and spec.loader is not None
builder = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = builder
spec.loader.exec_module(builder)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_hashes(path):
    return {p.relative_to(path).as_posix(): digest(p) for p in path.rglob("*") if p.is_file()}


@pytest.fixture
def synthetic_window(tmp_path):
    """SYNTHETIC fixture: deliberately asymmetric 2-row, 3-column calibration."""
    path = tmp_path / "calibration_extracts" / "synthetic.fits"
    path.parent.mkdir()
    hdus = [fits.PrimaryHDU()]
    hdus[0].header["COMMENT"] = "SYNTHETIC TEST DATA; not astronomical measurements."
    for name, data in (("CWAVE", [[1., 2., 3.], [4., 5., 6.]]),
                       ("CBAND", [[.01, .02, .03], [.04, .05, .06]])):
        hdu = fits.ImageHDU(np.array(data), name=name)
        hdu.header["NATIVEX0"] = 10
        hdu.header["NATIVEY0"] = 20
        hdu.header["BUNIT"] = "um"
        hdus.append(hdu)
    fits.HDUList(hdus).writeto(path)
    manifest = {
        "observations": [{"observation_id": "synthetic:A", "products": {
            "calibrations": [{"product_id": "synthetic:calibration"}]}}],
        "assets": [{"path": "calibration_extracts/synthetic.fits", "sha256": digest(path),
                    "product_id": "synthetic:calibration", "role": "calibration_extract"}],
    }
    (tmp_path / "package-manifest.json").write_text(json.dumps(manifest), encoding="utf-8", newline="\n")
    return path


@pytest.mark.parametrize("x,y,ix,iy,cw,cb", [
    (12, 20, 12, 20, 3., .03), (10, 21, 10, 21, 4., .04),
    (10.49, 20.49, 10, 20, 1., .01), (10.5, 20.5, 11, 21, 5., .05),
    (9.5, 19.5, 10, 20, 1., .01), (12.49, 21.49, 12, 21, 6., .06),
])
def test_native_index_and_nearest_rounding(synthetic_window, x, y, ix, iy, cw, cb):
    result = builder.lambda_at_native_pixel(synthetic_window, x, y)
    assert result["requested_pixel"] == {"x": x, "y": y}
    assert result["native_pixel"] == {"x": ix, "y": iy}
    assert result["rounding_method"] == "floor(v + 0.5); nearest integer, ties upward; no interpolation"
    assert result["cwave_um"] == cw
    assert result["cband_um"] == cb
    assert result["observation_id"] == "synthetic:A"
    assert result["product_id"] == "synthetic:calibration"
    assert result["window_sha256"] == digest(synthetic_window)
    assert Path(result["window_path"]) == synthetic_window


@pytest.mark.parametrize("x,y", [(9.49, 20), (12.5, 20), (10, 19.49), (10, 21.5),
                                      (float("nan"), 20), (10, float("inf"))])
def test_reject_outside_or_nonfinite_pixel(synthetic_window, x, y):
    with pytest.raises(ValueError, match="outside|finite"):
        builder.lambda_at_native_pixel(synthetic_window, x, y)


def test_reject_tampered_window(synthetic_window):
    with synthetic_window.open("ab") as stream:
        stream.write(b"tampered")
    with pytest.raises(RuntimeError, match="checksum mismatch"):
        builder.lambda_at_native_pixel(synthetic_window, 10, 20)


def test_lambda_cli_offline_and_manifest_unchanged(synthetic_window):
    package = synthetic_window.parent.parent
    before = tree_hashes(package)
    for selector in (["--observation-id", "synthetic:A"],):
        result = subprocess.run([sys.executable, str(SCRIPT), "--lambda-at", "--package", str(package),
                                 *selector, "--x", "10.5", "--y", "20.5"],
                                capture_output=True, text=True)
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["cwave_um"] == 5.
    assert tree_hashes(package) == before


def test_real_package_values():
    package = ROOT / "data" / "packages" / "eps-indi-b-d3"
    if not package.exists():
        pytest.skip("Local real FITS package does not exist; regenerate with build-validation-package.py")
    manifest = json.loads((package / "package-manifest.json").read_text(encoding="utf-8"))
    for epoch, x, y, cw, cb in [("A", 793, 1146, 1.934120774, .04693117),
                               ("B", 195, 1184, 1.933309913, .047647767)]:
        obs = manifest["observations"][ord(epoch) - ord("A")]
        pids = {p["product_id"] for p in obs["products"]["calibrations"]}
        asset = next(a for a in manifest["assets"] if a["role"] == "calibration_extract" and a["product_id"] in pids)
        # An existing but incomplete/corrupt package must fail, never skip.
        result = builder.lambda_at_native_pixel(package / asset["path"], x, y)
        assert result["cwave_um"] == pytest.approx(cw, abs=5e-10, rel=0)
        assert result["cband_um"] == pytest.approx(cb, abs=5e-10, rel=0)
        cli = subprocess.run([sys.executable, str(SCRIPT), "--lambda-at", "--package", str(package),
                              "--epoch", epoch, "--x", str(x), "--y", str(y)],
                             capture_output=True, text=True)
        assert cli.returncode == 0, cli.stderr
        assert json.loads(cli.stdout) == result


def test_crash_between_renames_recovers_before_verify(tmp_path, monkeypatch):
    target = tmp_path / "package"
    target.mkdir()
    (target / "old.txt").write_bytes(b"previous validated package")
    before = tree_hashes(target)
    backup = tmp_path / ".package-previous-crash"
    target.rename(backup)  # Simulated process death after the first rename.
    orphan = tmp_path / ".package-build-crash"
    orphan.mkdir()
    (orphan / "partial.txt").write_bytes(b"partial")
    monkeypatch.setattr(builder, "validate_manifest", lambda manifest: [])
    (backup / "package-manifest.json").write_text('{"assets": []}', encoding="utf-8", newline="\n")
    before["package-manifest.json"] = digest(backup / "package-manifest.json")
    assert builder.verify_package(target) == 0
    assert tree_hashes(target) == before
    assert not backup.exists() and not orphan.exists()
    print(f"Recovery sha256 before/after: {before} == {tree_hashes(target)}")


def test_real_package_recovery_and_failed_generation(tmp_path, monkeypatch):
    package = ROOT / "data" / "packages" / "eps-indi-b-d3"
    if not package.exists():
        pytest.skip("Local real FITS package does not exist; regenerate with build-validation-package.py")
    target = tmp_path / "package"
    shutil.copytree(package, target)
    before = tree_hashes(target)
    target.rename(tmp_path / ".package-previous-crash")
    orphan = tmp_path / ".package-build-crash"
    orphan.mkdir()
    (orphan / "partial.fits").write_bytes(b"SYNTHETIC interrupted write")
    assert builder.verify_package(target) == 0
    assert tree_hashes(target) == before
    assert not orphan.exists()

    def fail_mid_build(out, raw):
        (out / "partial.fits").write_bytes(b"SYNTHETIC interrupted write")
        raise RuntimeError("injected mid-build failure with real previous package")

    monkeypatch.setattr(builder, "build_package", fail_mid_build)
    monkeypatch.setattr(sys, "argv", [str(SCRIPT), "--out", str(target)])
    assert builder.main() == 1
    after = tree_hashes(target)
    assert after == before
    assert list(tmp_path.iterdir()) == [target]
    print("Real package sha256 before recovery/failure and after:")
    for path in sorted(before):
        print(f"{path}: {before[path]} == {after[path]}")


def test_ambiguous_recovery_preserves_all_candidates(tmp_path):
    for suffix in ("one", "two"):
        (tmp_path / f".package-previous-{suffix}").mkdir()
    with pytest.raises(RuntimeError, match="multiple.*restore"):
        builder.recover_package(tmp_path / "package")
    assert len(list(tmp_path.iterdir())) == 2


def test_generation_recovers_before_starting_new_build(tmp_path, monkeypatch):
    target = tmp_path / "package"
    backup = tmp_path / ".package-previous-crash"
    backup.mkdir()
    (backup / "old.txt").write_bytes(b"previous validated package")
    before = tree_hashes(backup)

    def stop_after_recovery(out, raw):
        assert tree_hashes(target) == before
        assert not backup.exists()
        raise RuntimeError("injected failure after recovery")

    monkeypatch.setattr(builder, "build_package", stop_after_recovery)
    monkeypatch.setattr(sys, "argv", [str(SCRIPT), "--out", str(target)])
    assert builder.main() == 1
    assert tree_hashes(target) == before


def test_failed_generation_preserves_previous_hashes(tmp_path, monkeypatch):
    target = tmp_path / "package"
    target.mkdir()
    (target / "old.txt").write_bytes(b"previous validated package")
    before = tree_hashes(target)

    def fail_mid_build(out, raw):
        (out / "partial.txt").write_bytes(b"partial new data")
        raise RuntimeError("injected mid-build failure")

    monkeypatch.setattr(builder, "build_package", fail_mid_build)
    monkeypatch.setattr(sys, "argv", [str(SCRIPT), "--out", str(target)])
    assert builder.main() == 1
    assert tree_hashes(target) == before
    assert list(tmp_path.iterdir()) == [target]
    print(f"Failed build sha256 before/after: {before} == {tree_hashes(target)}")


def test_failed_second_rename_rolls_back(tmp_path, monkeypatch):
    target, staged = tmp_path / "package", tmp_path / "staged"
    target.mkdir()
    staged.mkdir()
    (target / "old.txt").write_bytes(b"previous validated package")
    before = tree_hashes(target)
    replace = builder.os.replace

    def fail_publish(src, dst):
        if src == staged:
            raise OSError("injected second rename failure")
        replace(src, dst)

    monkeypatch.setattr(builder.os, "replace", fail_publish)
    with pytest.raises(OSError, match="injected"):
        builder.publish_package(staged, target)
    assert tree_hashes(target) == before


def test_provenance_ignores_untracked_files(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    repo.mkdir()
    script = repo / "script.py"
    script.write_bytes(b"# synthetic provenance fixture\n")

    def git(*args):
        return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True).stdout.strip()

    git("init")
    git("add", "script.py")
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "test fixture")
    head = git("rev-parse", "HEAD")
    (repo / "untracked.txt").write_bytes(b"untracked")
    monkeypatch.setattr(builder, "ROOT", repo)
    monkeypatch.setattr(builder, "__file__", str(script))
    commit, software = builder.code_provenance()
    versions = {s["name"]: s["version"] for s in software}
    assert commit == head
    assert versions["git:dirty"] == "false"
    assert versions["git:script_tracked"] == "true"
    script.write_bytes(b"# changed\n")
    commit, software = builder.code_provenance()
    assert commit is None
    assert {s["name"]: s["version"] for s in software}["git:dirty"] == "true"
    untracked_script = repo / "new.py"
    untracked_script.write_bytes(b"# untracked\n")
    monkeypatch.setattr(builder, "__file__", str(untracked_script))
    commit, software = builder.code_provenance()
    assert commit is None
    assert {s["name"]: s["version"] for s in software}["git:script_tracked"] == "false"


if __name__ == "__main__":
    raise SystemExit(pytest.main([str(Path(__file__)), "-p", "no:cacheprovider", *sys.argv[1:]]))
