"""Start the API and the unified landing server; shut down both on Ctrl-C."""
from __future__ import annotations

import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HEALTH_URL = "http://127.0.0.1:8000/api/v1/health"
SERVE_PORT = 4410
HEALTH_TIMEOUT_S = 120

_procs: list[subprocess.Popen[bytes]] = []


def _stop_children() -> None:
    for proc in _procs:
        if proc.poll() is None:
            proc.terminate()
    deadline = time.monotonic() + 8
    for proc in _procs:
        if proc.poll() is None:
            remaining = max(0.0, deadline - time.monotonic())
            try:
                proc.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                proc.kill()
    _procs.clear()


def _wait_for_health() -> bool:
    deadline = time.monotonic() + HEALTH_TIMEOUT_S
    while time.monotonic() < deadline:
        for proc in _procs:
            if proc.poll() is not None:
                print(f"API process exited with code {proc.returncode}", file=sys.stderr)
                return False
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=3) as resp:
                if resp.status == 200:
                    return True
        except (urllib.error.URLError, TimeoutError, OSError):
            pass
        time.sleep(0.4)
    return False


def main() -> int:
    api_cmd = [
        "uv",
        "run",
        "--directory",
        "backend",
        "uvicorn",
        "--factory",
        "skyshift.api.app:create_app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ]
    serve_cmd = [
        "uv",
        "run",
        "--no-project",
        "python",
        "scripts/serve_landing.py",
        str(SERVE_PORT),
    ]

    def on_signal(signum: int, _frame: object) -> None:
        print(f"\nStopping (signal {signum})…")
        _stop_children()
        sys.exit(0)

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    print("Starting API on http://127.0.0.1:8000 …")
    _procs.append(subprocess.Popen(api_cmd, cwd=REPO))
    print(f"Waiting for {HEALTH_URL} …")
    if not _wait_for_health():
        print("API did not become healthy in time.", file=sys.stderr)
        _stop_children()
        return 1
    print("API is up.")

    print(f"Starting unified server on http://127.0.0.1:{SERVE_PORT}/ …")
    _procs.append(subprocess.Popen(serve_cmd, cwd=REPO))
    print("Copernix ready. Press Ctrl-C to stop both processes.")

    try:
        while True:
            for proc in _procs:
                code = proc.poll()
                if code is not None:
                    print(f"Process {proc.args} exited with code {code}", file=sys.stderr)
                    _stop_children()
                    return code or 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        _stop_children()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())