"""Prepare the two real SPHEREx D3 display frames from the verified validation package.

Run from the repo root with the locked backend environment:
    uv run --locked --project backend python scripts/prepare-eps-indi-b-display.py PACKAGE_DIR
Add --verify to compare with the recorded assets without writing any files.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from skyshift.domain.flags import comparison_mask
from skyshift.domain.imaging import (
    grid_for,
    reproject,
    reproject_mask,
    subtract_background,
    union_percentiles,
)

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_MANIFEST = ROOT / "data/packages/eps-indi-b-d3/package-manifest.json"
CONTROLS = ROOT / "docs/reviews/measurement/epsilon-indi-b-pair-controls.json"
OUT = ROOT / "frontend/public/demo/epsilon-indi-b-d3"
FOV_ARCMIN = 3.1  # Crop within both native footprints, for display only.


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def encode_json(document: object) -> bytes:
    return (json.dumps(document, indent=2, allow_nan=False) + "\n").encode("utf-8")


def verify_asset(package: Path, entry: dict) -> Path:
    path = package / entry["path"]
    content = path.read_bytes()
    if len(content) != entry["bytes"] or hashlib.sha256(content).hexdigest() != entry["sha256"]:
        raise ValueError(f"Asset integrity check failed: {path}")
    return path


def prepare(package: Path) -> dict[str, bytes]:
    manifest = read_json(PACKAGE_MANIFEST)
    controls = read_json(CONTROLS)
    observations = {
        observation["observation_id"]: observation for observation in manifest["observations"]
    }
    assets = {(entry["role"], entry["product_id"]): entry for entry in manifest["assets"]}
    case = next(case for case in manifest["cases"] if case["case_ref"] == "eps-indi-b-d3-pair")
    endpoints = []

    for observation_id, epoch in zip(case["observation_ids"], ("A", "B"), strict=True):
        observation = observations[observation_id]
        evidence = controls["pair"][epoch]
        obs_id = observation["source"]["publisher_did"]
        if evidence["observation_id"] != obs_id or observation["detector"] != 3:
            raise ValueError(f"Measurement and package identities differ for {epoch}")
        products = observation["products"]
        native = products["native"]
        cutout = next(
            p
            for p in products["derived"]
            if native["product_id"] in p["parent_product_ids"]
            and ("native_cutout", p["asset"]["product_id"]) in assets
        )
        calibration = next(
            p
            for p in products["calibrations"]
            if p["uri"] == evidence["spectral"]["calibration_url"]
        )
        image_path = verify_asset(package, assets["native_cutout", cutout["asset"]["product_id"]])
        wave_path = verify_asset(package, assets["calibration_extract", calibration["product_id"]])

        x, y = evidence["spectral"]["pixel"]
        px, py = evidence["flags"]["measured_position_pix"]
        if (x, y) != (math.floor(px + 0.5), math.floor(py + 0.5)):
            raise ValueError(f"Calibration pixel is detached from measured centroid for {epoch}")
        with fits.open(wave_path) as waves:
            x0 = waves["CWAVE"].header["NATIVEX0"]
            y0 = waves["CWAVE"].header["NATIVEY0"]
            row, col = y - y0, x - x0
            height, width = waves["CWAVE"].data.shape
            if not (0 <= row < height and 0 <= col < width):
                raise ValueError(f"Calibration pixel is outside the package window for {epoch}")
            wavelength, bandwidth = (
                float(waves[name].data[row, col]) for name in ("CWAVE", "CBAND")
            )
        if (wavelength, bandwidth) != (
            evidence["spectral"]["cwave_um"],
            evidence["spectral"]["cband_um"],
        ):
            raise ValueError(f"Package calibration disagrees with the measurement for {epoch}")

        with fits.open(image_path) as cut:
            image = cut["IMAGE"]
            wcs = WCS(image.header, naxis=2)
            if (image.header["DATE-AVG"], image.header["MJD-AVG"]) != (
                next(
                    t["value"]
                    for t in observation["time"]["samples"]
                    if t["source_locator"] == "fits:IMAGE:DATE-AVG"
                ),
                evidence["mjd_avg"],
            ):
                raise ValueError(f"FITS and review dates disagree for {epoch}")
            flags, _ = comparison_mask(cut["FLAGS"].data)
            flags |= ~np.isfinite(image.data) | ~np.isfinite(cut["ZODI"].data)
            sky, _ = subtract_background(
                np.asarray(image.data, dtype=np.float32),
                np.asarray(cut["ZODI"].data, dtype=np.float32),
                ~flags,
            )
            ra, dec = wcs.pixel_to_world_values(px - x0, py - y0)
            endpoints.append(
                (
                    {
                        "visit_id": f"d3-{epoch.lower()}",
                        "obs_id": obs_id,
                        "t_mid": image.header["DATE-AVG"] + "Z",
                        "mjd_mid": evidence["mjd_avg"],
                        "detector": 3,
                        "wavelength_um": wavelength,
                        "bandwidth_um": bandwidth,
                        "unit": image.header["BUNIT"],
                        "provenance": {
                            "source_url": native["uri"],
                            "collection": observation["source"]["collection"],
                            "retrieved_at": observation["provenance"]["retrieved_at"],
                            "cache_layer": "precomputed",
                            "sha256": native["sha256"],
                        },
                    },
                    sky,
                    flags,
                    wcs,
                    float(ra),
                    float(dec),
                )
            )

    # These positions share a tiny field, so a component-wise midpoint is appropriate.
    ra = sum(endpoint[4] for endpoint in endpoints) / 2
    dec = sum(endpoint[5] for endpoint in endpoints) / 2
    grid = grid_for(ra, dec, FOV_ARCMIN)
    projected = []
    for _, sky, flags, wcs, _, _ in endpoints:
        data = reproject(sky, wcs, grid)
        data[reproject_mask(flags, wcs, grid)] = np.nan
        projected.append(data)

    p01, p50, p99 = union_percentiles(projected)
    artifacts = {}
    frames = []
    for index, ((frame, *_), data) in enumerate(zip(endpoints, projected, strict=True)):
        filename = f"frame-{index}.f32"
        artifacts[filename] = data.astype("<f4", copy=False).tobytes()
        frames.append(
            frame
            | {
                "index": index,
                "data_url": f"demo/epsilon-indi-b-d3/{filename}",
                "stats": {
                    "p01": p01,
                    "p50": p50,
                    "p99": p99,
                    "masked_fraction": float(np.count_nonzero(~np.isfinite(data)) / data.size),
                },
            }
        )
    artifacts["series.json"] = encode_json(
        {
            "series_id": case["case_ref"],
            "target": {"ra": ra, "dec": dec},
            "fov_arcmin": FOV_ARCMIN,
            "detector": 3,
            "grid": {
                "shape": [grid.size, grid.size],
                "crval_deg": [ra, dec],
                "pixel_scale_arcsec": grid.pixel_scale_arcsec,
                "projection": "TAN",
            },
            "frames": frames,
            "rejected": [],
            "comparability": {
                "level": "OBSERVED",
                "checks": [
                    {
                        "name": "distinct_observations",
                        "passed": True,
                        "detail": "Two D3 exposures on separate dates.",
                    },
                    {
                        "name": "common_display_grid",
                        "passed": True,
                        "detail": "Reprojected onto a common sky grid for display.",
                    },
                    {
                        "name": "local_flags",
                        "passed": all(
                            not controls["pair"][epoch]["flags"]["flagged_pixels_near_measured"]
                            and not controls["pair"][epoch]["flags"]["flagged_pixels_in_fit_window"]
                            for epoch in ("A", "B")
                        ),
                        "detail": "Reviewed flags around measured centres and fit windows.",
                    },
                    {
                        "name": "measurement_uncertainty_review",
                        "passed": False,
                        "detail": "The uncertainty model is provisional.",
                    },
                ],
            },
            "provenance": {
                "source_url": "https://irsa.ipac.caltech.edu/Missions/spherex.html",
                "retrieved_at": manifest["prepared_at"],
                "cache_layer": "precomputed",
            },
        }
    )
    displacement = controls["pair_displacement"]
    independent = next(
        row for row in displacement["rho_sweep"] if row["rho_wcs_between_dates"] == 0
    )
    artifacts["case.json"] = encode_json(
        {
            "case_ref": case["case_ref"],
            "observation_ids": [frame["obs_id"] for frame in frames],
            "separation_arcsec": math.hypot(*displacement["delta_arcsec"]),
            "delta_arcsec": displacement["delta_arcsec"],
            "sigma_delta_arcsec": independent["sigma_delta_arcsec"],
            "interpretation_ceiling": "OBSERVED",
            "source_revision": controls["code_ref"],
        }
    )
    return artifacts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package_dir", type=Path)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    artifacts = prepare(args.package_dir.resolve())
    if args.verify:
        for name, content in artifacts.items():
            if (OUT / name).read_bytes() != content:
                parser.exit(1, f"Recorded display asset differs: {name}\n")
        print(f"Verified {len(artifacts)} D3 display assets.")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        for name, content in artifacts.items():
            (OUT / name).write_bytes(content)
        print(f"Wrote {len(artifacts)} D3 display assets.")


if __name__ == "__main__":
    main()
