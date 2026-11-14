# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["httpx==0.28.1"]
# ///
"""Live smoke test of the SkyShift API on the 5 challenge objects (needs `mise run api-dev`).

For each object: resolve the name, build the series with its proper motion, fetch frame 0,
then request the series again to measure the warm path. Prints a table and writes JSON.

Usage: uv run --script scripts/smoke-five-objects.py [--api http://127.0.0.1:8000] [--out file]
"""

import argparse
import json
import time
from pathlib import Path

import httpx

OBJECTS = ["Barnard's Star", "Epsilon Indi B", "WISE 0855-0714", "RW Aurigae", "R Draconis"]


def timed(client: httpx.Client, url: str, **params: object) -> tuple[httpx.Response, float]:
    t0 = time.perf_counter()
    response = client.get(url, params=params)
    return response, time.perf_counter() - t0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    rows = []
    with httpx.Client(base_url=args.api, timeout=600) as c:
        for name in OBJECTS:
            r, _ = timed(c, "/api/v1/resolve", name=name)
            r.raise_for_status()
            target = r.json()
            m = target.get("motion") or {}
            params = {"ra": target["ra"], "dec": target["dec"], "fov_arcmin": 5}
            if m:
                params |= {
                    "pm_ra_masyr": m["pm_ra_masyr"],
                    "pm_dec_masyr": m["pm_dec_masyr"],
                    "parallax_mas": m.get("parallax_mas") or 0,
                    "ref_epoch_jyear": m["ref_epoch_jyear"],
                }
            series, cold = timed(c, "/api/v1/series", **params)
            if series.status_code != 200:
                rows.append({"object": name, "status": series.status_code, "detail": series.text[:300]})
                continue
            s = series.json()
            frame_bytes = 0
            if s["frames"]:
                f0 = c.get(s["frames"][0]["data_url"])
                frame_bytes = len(f0.content)
            again, warm = timed(c, "/api/v1/series", **params)
            rows.append(
                {
                    "object": name,
                    "detector": s["detector"],
                    "lambda_um": s["reference_wavelength_um"],
                    "tol_nm": s["wavelength_tolerance_nm"],
                    "frames": [f["t_mid"][:10] for f in s["frames"]],
                    "rejected": len(s["rejected"]),
                    "level": s["comparability"]["level"],
                    "cold_s": round(cold, 2),
                    "warm_s": round(warm, 3),
                    "warm_layer": again.headers.get("x-cache-layer"),
                    "frame0_bytes": frame_bytes,
                    "grid": s["grid"]["shape"],
                    "warnings": s["warnings"],
                }
            )
            print(json.dumps(rows[-1], ensure_ascii=False))
    if args.out:
        args.out.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
