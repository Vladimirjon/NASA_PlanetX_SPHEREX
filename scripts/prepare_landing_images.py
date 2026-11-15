"""Prepare an AI-generated illustration for the landing page.

Center-crops to the target ratio, resizes, burns in a visible "AI-generated" mark
(NASA Space Apps rule: AI images carry a watermark) and writes WebP.

Needs Pillow:  uv run --no-project --with pillow==12.3.0 python scripts/prepare_landing_images.py SRC OUT --ratio 4:3 --width 800
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

MARK = "AI-generated · Generada con IA"


def prepare(src: Path, out: Path, ratio: tuple[int, int], width: int, quality: int, mark: bool = True) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGB")
    rw, rh = ratio
    target_h = im.width * rh / rw
    if target_h <= im.height:  # too tall for the ratio: trim top and bottom
        top = round((im.height - target_h) / 2)
        im = im.crop((0, top, im.width, top + round(target_h)))
    else:  # too wide: trim the sides
        target_w = im.height * rw / rh
        left = round((im.width - target_w) / 2)
        im = im.crop((left, 0, left + round(target_w), im.height))
    if im.width > width:
        im = im.resize((width, round(width * rh / rw)), Image.LANCZOS)

    if mark:
        _burn_mark(im)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=quality, method=6)
    return im.width, im.height, out.stat().st_size


def _burn_mark(im: Image.Image) -> None:
    draw = ImageDraw.Draw(im, "RGBA")
    size = max(12, round(im.width * 0.017))
    font = ImageFont.load_default(size=size)
    pad = round(size * 0.5)
    box = draw.textbbox((0, 0), MARK, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    x1, y1 = im.width - pad, im.height - pad
    draw.rectangle((x1 - tw - 2 * pad, y1 - th - 2 * pad, x1, y1), fill=(0, 0, 0, 170))
    draw.text((x1 - tw - pad, y1 - th - pad - box[1]), MARK, font=font, fill=(255, 255, 255, 235))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("src", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--ratio", default="4:3", help="W:H, e.g. 4:3 or 16:9")
    p.add_argument("--width", type=int, default=800)
    p.add_argument("--quality", type=int, default=82)
    p.add_argument("--no-mark", action="store_true", help="skip the burned-in mark (full-bleed backdrops; the page overlays its own badge)")
    a = p.parse_args()
    rw, rh = (int(v) for v in a.ratio.split(":"))
    w, h, size = prepare(a.src, a.out, (rw, rh), a.width, a.quality, mark=not a.no_mark)
    print(f"{a.out}  {w}x{h}  {size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
