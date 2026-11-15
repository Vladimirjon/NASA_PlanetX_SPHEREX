# /// script
# requires-python = ">=3.13"
# dependencies = ["numpy==2.5.4", "pillow==13.0.0"]
# ///
"""Render transparent axial rotation videos from the landing's conceptual artwork.

Run from the root with uv run --script scripts/render-landing-portraits.py.
The hidden hemisphere is approximated by mirroring the visible texture.
"""

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ASSETS = Path(__file__).resolve().parents[1] / "landing" / "assets"
SIZE, FRAMES, FPS = 800, 360, 60
# Centre and elliptical radii in the 400 px source, followed by direction.
# The smaller companion is painted last to preserve the overlap in the original.
SPHERES = {
    "wise-0855": [(199, 199, 163, 166, 1)],
    "barnard": [(199, 199, 164, 167, 1)],
    "epsilon-indi-b": [(163, 198, 129, 132, 1), (304, 274, 62, 62, -1)],
    "rw-aurigae": [(200, 195, 45, 40, 1)],
    "r-draconis": [(199, 200, 163, 162, 1)],
}


def disk_motion(xx: np.ndarray, yy: np.ndarray) -> tuple:
    """Projected dust texture. Geometry and periods belong to the artwork only."""
    scale = SIZE / 400
    dx, dy = xx - 200 * scale, yy - 200 * scale
    tilt = np.deg2rad(-29)
    cosine, sine = np.cos(tilt), np.sin(tilt)
    u = (cosine * dx + sine * dy) / (180 * scale)
    v = (-sine * dx + cosine * dy) / (48 * scale)
    radius = np.sqrt(u * u + v * v)
    angle = np.arctan2(v, u)
    star_distance = np.sqrt(dx * dx + (yy - 195 * scale) ** 2)
    weight = np.clip((1 - radius) * 8, 0, 1)
    weight *= np.clip((star_distance / scale - 49) / 10, 0, 1)
    return radius, angle, weight[..., None], cosine, sine


def sample_disk(
    colors: np.ndarray,
    radius: np.ndarray,
    angle: np.ndarray,
    cosine: float,
    sine: float,
) -> np.ndarray:
    scale = SIZE / 400
    u, v = 180 * scale * radius * np.cos(angle), 48 * scale * radius * np.sin(angle)
    sx, sy = 200 * scale + cosine * u - sine * v, 200 * scale + sine * u + cosine * v
    x = np.clip(sx, 0, SIZE - 2)
    y = np.clip(sy, 0, SIZE - 2)
    ix, iy = x.astype(np.intp), y.astype(np.intp)
    fx, fy = (x - ix)[..., None], (y - iy)[..., None]
    top = colors[iy, ix] * (1 - fx) + colors[iy, ix + 1] * fx
    bottom = colors[iy + 1, ix] * (1 - fx) + colors[iy + 1, ix + 1] * fx
    detail = top * (1 - fy) + bottom * fy
    # Never transport the bright stellar photosphere into the dust annulus.
    star = (sx - 200 * scale) ** 2 + (sy - 195 * scale) ** 2 < (58 * scale) ** 2
    return np.where(star[..., None], 1, np.clip(detail, 0.65, 1.35))


def render_rotation(name: str, spheres: list[tuple[int, int, int, int, int]]) -> None:
    with Image.open(ASSETS / f"portrait-{name}.png") as img:
        original = np.array(
            img.convert("RGBA").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        )
    rgba = original.astype(np.float32)
    # Separate broad illumination from surface detail so the light stays fixed.
    lighting = np.array(
        Image.fromarray(original).filter(ImageFilter.GaussianBlur(SIZE * 0.03))
    )[..., :3].astype(np.float32)
    colors = (rgba[..., :3] + 8) / (lighting + 8)
    yy, xx = np.indices((SIZE, SIZE), dtype=np.float32)
    rows = yy.astype(np.intp)
    sphere_layers = []
    companion = None
    if name == "epsilon-indi-b":
        scale = SIZE / 400
        companion = ((xx - 304 * scale) / (62 * scale)) ** 2 + (
            (yy - 274 * scale) / (62 * scale)
        ) ** 2 <= 1
    disk = disk_motion(xx, yy) if name == "rw-aurigae" else None
    for cx, cy, rx, ry, direction in spheres:
        cx, cy, rx, ry = (v * SIZE / 400 for v in (cx, cy, rx, ry))
        x, y = (xx - cx) / rx, (yy - cy) / ry
        latitude_radius = np.sqrt(np.maximum(0, 1 - y * y))
        z = np.sqrt(np.maximum(0, 1 - x * x - y * y))
        longitude = np.arctan2(x, z)
        weight = np.clip((1 - x * x - y * y) * 8, 0, 1)
        if companion is not None and direction == 1:
            weight[companion] = 0
        # Leave the foreground dust band across RW Aurigae's photosphere in place.
        if name == "rw-aurigae":
            weight *= np.clip((-y - 0.52 * x + 0.22) * 5, 0, 1)
        sphere_layers.append(
            (cx, rx, longitude, latitude_radius, weight[..., None], direction)
        )

    output = ASSETS / f"portrait-spin-{name}.webm"
    temporary = output.with_suffix(".rendering.webm")
    encoder = subprocess.Popen(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            f"{SIZE}x{SIZE}",
            "-r",
            str(FPS),
            "-i",
            "pipe:0",
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-b:v",
            "0",
            "-crf",
            "18",
            "-deadline",
            "good",
            "-cpu-used",
            "4",
            "-row-mt",
            "1",
            str(temporary),
        ],
        stdin=subprocess.PIPE,
    )
    assert encoder.stdin is not None
    for i in range(FRAMES):
        frame = rgba.copy()
        phase = 2 * np.pi * i / FRAMES
        for cx, rx, longitude, latitude_radius, weight, direction in sphere_layers:
            source_x = 0.84 * latitude_radius * np.sin(longitude + direction * phase)
            sample = np.clip(cx + rx * source_x, 0, SIZE - 1)
            if companion is not None and direction == 1:
                # The left hemisphere is wholly visible. Reconstruct the covered
                # side from it without a moving circular cut in the texture.
                sample = np.minimum(sample, 2 * cx - sample)
            low = sample.astype(np.intp)
            blend = (sample - low)[..., None]
            color = colors[rows, low] * (1 - blend)
            color += colors[rows, np.minimum(low + 1, SIZE - 1)] * blend
            shaded = np.clip(color * (lighting + 8) - 8, 0, 255)
            frame[..., :3] += weight * (shaded - frame[..., :3])
        if disk is not None:
            radius, angle, weight, cosine, sine = disk
            outer = sample_disk(colors, radius, angle - phase, cosine, sine)
            inner = sample_disk(colors, radius, angle - 2 * phase, cosine, sine)
            mix = np.clip((0.8 - radius) / 0.5, 0, 1)[..., None]
            detail = outer * (1 - mix) + inner * mix
            dust = np.clip(detail * (lighting + 8) - 8, 0, 255)
            frame[..., :3] += weight * 0.7 * (dust - frame[..., :3])
        encoder.stdin.write(frame.round().astype(np.uint8).tobytes())
    encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError(f"Could not encode {output}")
    temporary.replace(output)
    print(f"Rendered {name}: {SIZE}px, {FPS}fps, {FRAMES / FPS}s", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("objects", nargs="*", choices=list(SPHERES))
    args = parser.parse_args()
    for object_name in args.objects or SPHERES:
        render_rotation(object_name, SPHERES[object_name])
