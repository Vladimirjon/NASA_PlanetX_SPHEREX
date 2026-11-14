# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["playwright==1.65.2", "numpy==2.5.4", "pillow==13.0.0", "scikit-image==0.26.0"]
# ///
"""Visual parity check: our sky engine vs the official IRSA SPHEREx HiPS viewer (Aladin Lite).

For each reference view, both viewers are opened at the same center, field of view, spectral
plane and viewport size; the central region is compared after robust normalisation.
Outputs, per view: side-by-side + |difference| composite PNG and SSIM / correlation numbers in
report.json and report.md. This measures *visual* parity of the visualization layer only; it is
never evidence of scientific correctness (PNG tiles are 8-bit and pre-stretched).

Usage:
  uv run --script scripts/parity-check.py --ours http://127.0.0.1:5173 --out docs/reviews/parity
"""

import argparse
import io
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import Page, sync_playwright
from skimage.metrics import structural_similarity

IRSA_VIEWER = "https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/"
VIEWPORT = {"width": 1200, "height": 800}
CENTER_CROP = 0.6  # compare the central 60% to avoid each viewer's UI chrome


@dataclass(frozen=True)
class View:
    name: str
    ra: float
    dec: float
    fov: float
    plane: int  # 0-based HiPS cube frame index (IRSA viewer `frame`)


# J2000 catalog positions (SIMBAD); proper motion over 2000→2026 is < 5 arcmin, irrelevant at
# these fields of view. Plane 19 = 1.167 µm (properties data_cube_crval3_arr).
VIEWS = [
    View("allsky", 180.0, 0.0, 180.0, 19),
    View("wise0855", 133.7951, -7.2451, 1.0, 19),
    View("barnard", 269.4521, 4.6934, 1.0, 19),
    View("eps-indi-b", 331.0440, -56.7830, 1.0, 19),
    View("rw-aur", 76.9563, 30.4014, 1.0, 19),
    View("r-dra", 248.1675, 66.7550, 1.0, 19),
    View("north-pole", 0.0, 89.9, 10.0, 19),
    View("ra-wrap", 359.9, 0.0, 5.0, 60),
]


@dataclass
class Result:
    view: str
    ssim: float
    pearson: float
    ours_blank_fraction: float
    irsa_blank_fraction: float
    composite: str


def capture(page: Page, url: str, settle_ms: int) -> np.ndarray:
    page.goto(url, wait_until="networkidle", timeout=90_000)
    page.wait_for_timeout(settle_ms)
    png = page.screenshot(type="png")
    return np.asarray(Image.open(io.BytesIO(png)).convert("L"), dtype=np.float64)


def center(img: np.ndarray) -> np.ndarray:
    h, w = img.shape
    dh, dw = int(h * (1 - CENTER_CROP) / 2), int(w * (1 - CENTER_CROP) / 2)
    return img[dh : h - dh, dw : w - dw]


def normalise(img: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(img, [1, 99])
    return np.clip((img - lo) / max(hi - lo, 1e-9), 0, 1)


def compare(view: View, ours: np.ndarray, irsa: np.ndarray, out: Path) -> Result:
    a, b = normalise(center(ours)), normalise(center(irsa))
    ssim = float(structural_similarity(a, b, data_range=1.0))
    pearson = float(np.corrcoef(a.ravel(), b.ravel())[0, 1]) if a.std() and b.std() else 0.0
    diff = np.abs(a - b)
    composite = np.concatenate([a, b, diff], axis=1)
    path = out / f"{view.name}.png"
    Image.fromarray((composite * 255).astype(np.uint8)).save(path)
    return Result(
        view=view.name,
        ssim=round(ssim, 4),
        pearson=round(pearson, 4),
        ours_blank_fraction=round(float((center(ours) < 3).mean()), 4),
        irsa_blank_fraction=round(float((center(irsa) < 3).mean()), 4),
        composite=path.name,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ours", help="Base URL of our viewer (dev or preview)")
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Compare IRSA against itself on 2 views; SSIM must be ~1 (validates this tool)",
    )
    parser.add_argument("--out", type=Path, default=Path("docs/reviews/parity"))
    parser.add_argument("--projection", default="SIN")
    parser.add_argument("--settle-ms", type=int, default=4000)
    parser.add_argument("--chromium", help="Path to a Chromium executable (optional)")
    args = parser.parse_args()
    if not args.self_test and not args.ours:
        parser.error("--ours is required unless --self-test")
    views = VIEWS[:2] if args.self_test else VIEWS
    args.out.mkdir(parents=True, exist_ok=True)

    results: list[Result] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium) if args.chromium else pw.chromium.launch()
        page = browser.new_page(viewport=VIEWPORT, device_scale_factor=1)
        for v in views:
            ours_url = (
                f"{(args.ours or '').rstrip('/')}/?ra={v.ra}&dec={v.dec}&fov={v.fov}"
                f"&plane={v.plane}&proj={args.projection}"
            )
            irsa_url = f"{IRSA_VIEWER}?ra={v.ra}&dec={v.dec}&fov={v.fov}&frame={v.plane}&hideProperties"
            ours = capture(page, irsa_url if args.self_test else ours_url, args.settle_ms)
            irsa = capture(page, irsa_url, args.settle_ms)
            results.append(compare(v, ours, irsa, args.out))
            print(f"{v.name:12} SSIM={results[-1].ssim:.3f} r={results[-1].pearson:.3f}")
        browser.close()

    (args.out / "report.json").write_text(json.dumps([asdict(r) for r in results], indent=2))
    lines = [
        "# Paridad visual: SkyShift vs visor IRSA (Aladin Lite)",
        "",
        f"Proyección: {args.projection} · viewport {VIEWPORT['width']}x{VIEWPORT['height']} · "
        f"recorte central {int(CENTER_CROP * 100)} %. Solo visualización, no ciencia.",
        "Cada PNG: izquierda = nuestro, centro = IRSA, derecha = |diferencia|.",
        "",
        "| Vista | SSIM | Pearson r | Vacío nuestro | Vacío IRSA |",
        "| --- | --- | --- | --- | --- |",
    ]
    lines += [
        f"| {r.view} | {r.ssim} | {r.pearson} | {r.ours_blank_fraction} | {r.irsa_blank_fraction} |"
        for r in results
    ]
    (args.out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
