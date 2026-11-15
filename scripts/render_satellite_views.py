"""Render the SPHEREx views the landing page plays back (offline, on the CPU).

Chrome runs with SwiftShader; the render page refuses to start if WebGL reports anything
else, so the Intel GPU is never used. Frames are saved as WebP with alpha and the manifest
the page and scripts/check-landing.mjs read is rewritten.

  python3 scripts/render_satellite_views.py            # defaults: 180 yaw x 9 pitch, 448 px
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import threading
import time
from concurrent.futures import ProcessPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VIEWS = ROOT / "landing" / "assets" / "spherex-views"
SAT3D = ROOT / "landing" / "js" / "sat3d.js"


def to_webp(job: tuple[str, str, int]) -> None:
    src, dst, quality = job
    Image.open(src).convert("RGBA").save(dst, "WEBP", quality=quality, method=4)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--yaw", type=int, default=180)
    ap.add_argument("--pitch", default="-48,-36,-24,-12,0,12,24,36,48")
    ap.add_argument("--size", type=int, default=448)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--port", type=int, default=4477)
    a = ap.parse_args()
    pitches = [float(v) for v in a.pitch.split(",")]

    raw = Path(tempfile.mkdtemp(prefix="sat-raw-"))
    state = {"done": False, "renderer": "", "saved": 0}

    class H(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kw):
            super().__init__(*args, directory=str(ROOT), **kw)

        def log_message(self, *args):
            pass

        def do_POST(self):
            url = urlparse(self.path)
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            if url.path == "/save":
                (raw / (parse_qs(url.query)["name"][0] + ".png")).write_bytes(body)
                state["saved"] += 1
            elif url.path == "/renderer":
                state["renderer"] = body.decode()
            elif url.path == "/done":
                state["done"] = True
            self.send_response(204)
            self.end_headers()

    srv = ThreadingHTTPServer(("127.0.0.1", a.port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    profile = tempfile.mkdtemp(prefix="sat-chrome-")
    url = f"http://127.0.0.1:{a.port}/scripts/render_satellite.html?yaw={a.yaw}&pitch={a.pitch}&size={a.size}"
    chrome = subprocess.Popen([
        "google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--use-gl=angle", "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader", f"--user-data-dir={profile}", "--window-size=600,600", url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    total = a.yaw * len(pitches)
    try:
        t0 = time.time()
        while not state["done"]:
            time.sleep(5)
            print(f"\r{state['saved']}/{total}  renderer={state['renderer'] or '?'}  {time.time() - t0:.0f}s", end="", flush=True)
            if chrome.poll() is not None and not state["done"]:
                raise SystemExit("\nchrome exited before finishing (see renderer above)")
            if time.time() - t0 > 3600:
                raise SystemExit("\ntimeout")
        print()
    finally:
        chrome.terminate()
        srv.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

    # Build next to the live folder and swap at the end, so the page never sees a half-written set.
    staging = VIEWS.with_name(VIEWS.name + ".new")
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)
    jobs = [(str(png), str(staging / (png.stem + ".webp")), a.quality) for png in sorted(raw.glob("*.png"))]
    with ProcessPoolExecutor() as pool:
        list(pool.map(to_webp, jobs, chunksize=16))
    (staging / "manifest.json").write_text(json.dumps({
        "source": "NASA’s Eyes · NASA/JPL-Caltech",
        "model": "model/spherex.gltf",
        "yawFrames": a.yaw,
        "pitchDegrees": pitches,
        "width": a.size,
        "height": a.size,
        "rendering": "Offline SwiftShader (CPU), original scene lighting. No AI image generation.",
    }, indent=2) + "\n")
    old = VIEWS.with_name(VIEWS.name + ".old")
    shutil.rmtree(old, ignore_errors=True)
    if VIEWS.exists():
        VIEWS.rename(old)
    staging.rename(VIEWS)
    # keep the player's grid in step with the files it will request
    pitch_js = "[" + ",".join(f"{v:g}" for v in pitches) + "]"
    line = f"export const VIEWS={{yaw:{a.yaw},pitchDegrees:{pitch_js},start:{pitches.index(0.0)}}};"
    SAT3D.write_text(re.sub(r"^export const VIEWS=.*$", line, SAT3D.read_text(), count=1, flags=re.M))
    shutil.rmtree(old, ignore_errors=True)
    shutil.rmtree(raw, ignore_errors=True)
    size = sum(f.stat().st_size for f in VIEWS.glob("*.webp"))
    print(f"{len(list(VIEWS.glob('*.webp')))} views, {size / 1e6:.1f} MB, renderer: {state['renderer']}")


if __name__ == "__main__":
    main()
