# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["httpx==0.28.1"]
# ///
"""Record real API series for the 5 challenge objects as an offline demo (static files).

Writes frontend/public/demo/<slug>/series.json (+ frame-<i>.f32, little-endian Float32) and
frontend/public/demo/manifest.json. Every file keeps the API provenance unchanged; only
`data_url` is rewritten to the static path. Needs the API running (mise run api-dev).

Usage: uv run --script scripts/record-demo.py [--api http://127.0.0.1:8000]
"""

import argparse
import json
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "demo"
OBJECTS = {
    "barnards-star": "Barnard's Star",
    "epsilon-indi-b": "Epsilon Indi B",
    "wise-0855": "WISE 0855-0714",
    "rw-aurigae": "RW Aurigae",
    "r-draconis": "R Draconis",
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--fov-arcmin", type=float, default=5.0)
    args = parser.parse_args()
    manifest = []
    with httpx.Client(base_url=args.api, timeout=900) as c:
        for slug, name in OBJECTS.items():
            target = c.get("/api/v1/resolve", params={"name": name}).raise_for_status().json()
            params: dict[str, object] = {
                "ra": target["ra"],
                "dec": target["dec"],
                "fov_arcmin": args.fov_arcmin,
            }
            if motion := target.get("motion"):
                params |= {k: v for k, v in motion.items() if v is not None}
            series = c.get("/api/v1/series", params=params).raise_for_status().json()
            folder = OUT / slug
            folder.mkdir(parents=True, exist_ok=True)
            for frame in series["frames"]:
                data = c.get(frame["data_url"]).raise_for_status().content
                (folder / f"frame-{frame['index']}.f32").write_bytes(data)
                frame["data_url"] = f"demo/{slug}/frame-{frame['index']}.f32"
            (folder / "series.json").write_text(json.dumps(series, indent=1), encoding="utf-8")
            manifest.append(
                {"slug": slug, "name": target.get("canonical_name") or name, "resolve": target,
                 "series": f"demo/{slug}/series.json", "frames": len(series["frames"])}
            )
            print(slug, len(series["frames"]), "frames")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
