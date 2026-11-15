"""Build the three schematic frames of the "How we find a change" figure.

One AI-generated star field (ChatGPT Images, stars only, no moving object) is the base.
A single star sprite is copied from it and placed at two positions, so the "earlier" and
"later" frames are identical except for that one object; the third frame is computed as
later - earlier (grey = unchanged, dark = where it was, bright = where it is). The frames
are illustrative, not data, and the page captions say so.

  uv run --no-project --with pillow==12.3.0 --with numpy python scripts/make_method_frames.py SRC.png
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from prepare_landing_images import _burn_mark  # noqa: E402  (the same visible AI mark as the object illustrations)

OUT = Path(__file__).resolve().parent.parent / "landing" / "assets"
SPRITE_AT, SPRITE_R = (957, 309), 34       # the brighter star used as the moving object (source px)
EARLIER, LATER = (370, 640), (850, 560)    # empty middle-left / middle-right areas (source px)
GREY = np.array([50, 58, 69], float)       # #323a45, the unchanged level of the difference frame


GROW = 1.7  # the moving object is drawn larger than its source star so it reads at thumbnail size


def paste(base: np.ndarray, sprite: np.ndarray, cx: int, cy: int) -> None:
    r = sprite.shape[0] // 2
    base[cy - r:cy + r + 1, cx - r:cx + r + 1] += sprite


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("src", type=Path)
    p.add_argument("--size", type=int, default=640)
    p.add_argument("--quality", type=int, default=80)
    a = p.parse_args()

    src = np.asarray(Image.open(a.src).convert("RGB"), float)
    sx, sy = SPRITE_AT
    r = SPRITE_R
    patch = src[sy - r:sy + r + 1, sx - r:sx + r + 1]
    sprite = np.clip(patch - np.median(patch.reshape(-1, 3), axis=0), 0, None)  # star only, no background
    # fade the sprite edge to zero so no square shows
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    sprite *= np.clip(1.3 - np.hypot(xx, yy) / r, 0, 1)[..., None]

    n = 2 * round(r * GROW) + 1
    sprite = np.stack([np.asarray(Image.fromarray(sprite[..., c].astype(np.float32), mode="F").resize((n, n), Image.BICUBIC)) for c in range(3)], axis=-1)
    sprite = np.clip(sprite, 0, None)

    rng = np.random.default_rng(7)
    frames = []
    for pos in (EARLIER, LATER):
        f = src.copy()
        paste(f, sprite * 1.15, *pos)
        f += rng.normal(0, 1.6, f.shape[:2])[..., None]          # independent sensor noise per frame
        frames.append(np.clip(f, 0, 255))
    earlier, later = frames

    d = (later - earlier).mean(axis=2)                                # luminance-ish change
    k = np.clip(d / 140.0, -1, 1)[..., None]                          # -1 .. 1
    diff = np.where(k >= 0, GREY + (255 - GREY) * k, GREY * (1 + k))  # up to white, down to black

    names = {"earlier": earlier, "later": later, "diff": diff}
    for name, arr in names.items():
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((a.size, a.size), Image.LANCZOS)
        _burn_mark(im)  # rubric: images generated with AI carry a visible mark
        out = OUT / f"method-{name}.webp"
        im.save(out, "WEBP", quality=a.quality, method=6)
        print(out.name, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
