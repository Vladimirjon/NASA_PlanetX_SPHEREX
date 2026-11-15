"""Unified dev server: landing/, viewer build, and API proxy on one origin.

Run: mise run landing | mise run copernix (API + this server)
     uv run --no-project python scripts/serve_landing.py [port]
"""
from __future__ import annotations

import json
import mimetypes
import sys
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlparse

REPO = Path(__file__).resolve().parent.parent
LANDING = REPO / "landing"
VIEWER = REPO / "frontend" / "dist-copernix"
DEMO = REPO / "frontend" / "public" / "demo"
API_ORIGIN = "http://127.0.0.1:8000"
DEFAULT_PORT = 4410
PROXY_TIMEOUT_S = 65

VIEWER_PLACEHOLDER = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copernix · viewer</title>
<style>
:root{color-scheme:dark;--bg:#030e22;--text:#fff;--dim:#aeb0b5;--accent:#428bca}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;display:grid;place-items:center;padding:2rem;background:var(--bg);color:var(--text);
  font:400 1.0625rem/1.55 "Segoe UI",system-ui,sans-serif}
.panel{max-width:28rem;padding:1.5rem 1.75rem;border:1px solid rgba(66,139,202,.34);border-radius:14px;
  background:rgba(4,18,43,.97)}
h1{font-size:1.25rem;font-weight:600;margin-bottom:.75rem}
p{color:var(--dim);margin-bottom:1rem}
code{font-family:ui-monospace,Menlo,monospace;font-size:.95em;color:var(--accent)}
a{color:var(--accent)}
</style>
</head>
<body>
<main class="panel">
  <h1>Visor aún no compilado</h1>
  <p>Construye el visor con <code>mise run copernix-build</code> y vuelve a cargar esta página.</p>
  <p><a href="/">Volver a la landing</a></p>
</main>
</body>
</html>
""".encode("utf-8")


class CopernixHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".wasm": "application/wasm",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".gltf": "model/gltf+json",
        ".bin": "application/octet-stream",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        self._dispatch()

    def do_HEAD(self) -> None:
        self._dispatch(head_only=True)

    def do_POST(self) -> None:
        self._proxy_api()

    def do_PUT(self) -> None:
        self._proxy_api()

    def do_PATCH(self) -> None:
        self._proxy_api()

    def do_DELETE(self) -> None:
        self._proxy_api()

    def do_OPTIONS(self) -> None:
        self._proxy_api()

    def _parsed_path(self) -> str:
        return unquote(urlparse(self.path).path)

    def _dispatch(self, *, head_only: bool = False) -> None:
        path = self._parsed_path()
        if path == "/viewer":
            self.send_response(HTTPStatus.MOVED_PERMANENTLY)
            self.send_header("Location", "/viewer/")
            self.end_headers()
            return
        if path.startswith("/viewer/") or path == "/viewer/":
            self._serve_viewer(path.removeprefix("/viewer").lstrip("/"), head_only=head_only)
            return
        if path.startswith("/demo/") or path == "/demo":
            rel = path.removeprefix("/demo").lstrip("/")
            self._serve_static(DEMO, rel or "manifest.json", head_only=head_only)
            return
        if path.startswith("/api/"):
            if head_only:
                self._proxy_api(head_only=True)
            else:
                self._proxy_api()
            return
        rel = path.lstrip("/")
        self._serve_static(LANDING, rel, head_only=head_only)

    def _safe_relative(self, raw: str) -> Path | None:
        if not raw or raw.endswith("/"):
            raw = f"{raw}index.html".removeprefix("/")
        try:
            parts = PurePosixPath(raw).parts
        except ValueError:
            return None
        if ".." in parts:
            return None
        return Path(*parts)

    def _serve_static(self, root: Path, rel: str, *, head_only: bool) -> None:
        if not rel:
            rel = "index.html"
        target = self._safe_relative(rel)
        if target is None:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        file_path = (root / target).resolve()
        if not str(file_path).startswith(str(root.resolve())):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if file_path.is_dir():
            file_path = file_path / "index.html"
        if not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        ctype = self._guess_type(file_path)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(file_path.stat().st_size))
        self.end_headers()
        if not head_only:
            with file_path.open("rb") as fh:
                self.wfile.write(fh.read())

    def _guess_type(self, file_path: Path) -> str:
        ctype = self.extensions_map.get(file_path.suffix.lower())
        if ctype:
            return ctype
        guessed, _ = mimetypes.guess_type(str(file_path), strict=False)
        return guessed or "application/octet-stream"

    def _proxy_api(self, *, head_only: bool = False) -> None:
        url = f"{API_ORIGIN}{self.path}"
        hop_by_hop = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
                      "te", "trailers", "transfer-encoding", "upgrade", "host"}
        headers = {
            k: v for k, v in self.headers.items()
            if k.lower() not in hop_by_hop
        }
        length = self.headers.get("Content-Length")
        body = self.rfile.read(int(length)) if length else None
        req = urllib.request.Request(url, data=body, method=self.command, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=PROXY_TIMEOUT_S) as upstream:
                self.send_response(upstream.status)
                for key, value in upstream.headers.items():
                    if key.lower() in hop_by_hop:
                        continue
                    self.send_header(key, value)
                self.end_headers()
                if not head_only and self.command != "HEAD":
                    while True:
                        chunk = upstream.read(65_536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
        except urllib.error.HTTPError as err:
            self.send_response(err.code)
            for key, value in err.headers.items():
                if key.lower() in hop_by_hop:
                    continue
                self.send_header(key, value)
            self.end_headers()
            if not head_only and self.command != "HEAD":
                while True:
                    chunk = err.read(65_536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except (urllib.error.URLError, TimeoutError, OSError):
            payload = json.dumps({"error": "api_unavailable"}).encode("utf-8")
            self.send_response(HTTPStatus.BAD_GATEWAY)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if not head_only:
                self.wfile.write(payload)

    def _serve_viewer(self, rel: str, *, head_only: bool) -> None:
        if not VIEWER.is_dir():
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(VIEWER_PLACEHOLDER)))
            self.end_headers()
            if not head_only:
                self.wfile.write(VIEWER_PLACEHOLDER)
            return
        if not rel:
            rel = "index.html"
        safe = self._safe_relative(rel)
        if safe is None:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        file_path = (VIEWER / safe).resolve()
        if not str(file_path).startswith(str(VIEWER.resolve())):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not file_path.is_file():
            index = VIEWER / "index.html"
            if index.is_file() and "." not in PurePosixPath(rel).name:
                file_path = index
            else:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
        ctype = self._guess_type(file_path)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(file_path.stat().st_size))
        self.end_headers()
        if not head_only:
            with file_path.open("rb") as fh:
                self.wfile.write(fh.read())


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    with ThreadingHTTPServer(("127.0.0.1", port), CopernixHandler) as server:
        viewer_note = VIEWER if VIEWER.is_dir() else "viewer placeholder"
        print(f"Serving landing at http://127.0.0.1:{port}/")
        print(f"  viewer → {viewer_note}")
        print(f"  /api/* → {API_ORIGIN} (proxy, {PROXY_TIMEOUT_S}s timeout)")
        server.serve_forever()


if __name__ == "__main__":
    main()