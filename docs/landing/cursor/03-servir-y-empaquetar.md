# Encargo 3 · Servir landing + visor + API en un solo origen

Carpeta tuya: **`scripts/`** (`serve_landing.py`, `build-landing.mjs`, `check-landing.mjs`), **`mise.toml`**, `landing/README.md` (solo la sección de ejecución) y `docs/landing/` (notas). No toques `frontend/src/**` ni `backend/**`. El encargo 2 genera `frontend/dist-copernix/` (build de Vite con `base: '/viewer/'`); si aún no existe cuando empieces, escribe tu parte contra esa ruta y no esperes.

1. `scripts/serve_landing.py` (servidor de desarrollo, sin caché, puerto 4410, solo `127.0.0.1`):
   - `/` → `landing/` (como ahora).
   - `/viewer/` y `/viewer/**` → `frontend/dist-copernix/` (`/viewer` redirige a `/viewer/`); si la carpeta no existe, responde una página simple en el estilo de la landing que diga «Construye el visor con `mise run copernix-build`», no un 404 mudo.
   - `/api/**` → proxy a `http://127.0.0.1:8000` (streaming de cuerpo, cabeceras básicas, timeout de 65 s porque `/series` puede tardar 60 s). Si la API no responde, `502` con JSON `{ "error": "api_unavailable" }`.
   - Tipos MIME correctos para `.wasm`, `.json`, `.webp`, `.woff2`, `.js`.
2. `mise.toml` (las tareas son arrays de comandos simples; sin `&&`, pipes ni `$VAR` — la lógica va en un script Python): `copernix-build` (pnpm install --frozen-lockfile + `build:copernix`), `copernix` (arranca API y servidor juntos mediante un script `scripts/run_copernix.py` que lanza uvicorn y `serve_landing.py`, espera a que `/api/v1/health` (o el endpoint de salud real; revísalo en `contracts/openapi.yaml`) responda y termina ambos con Ctrl-C). Mantén `landing` como está.
3. `scripts/build-landing.mjs`: el paquete estático `dist/landing` incluye `viewer/` (copia de `frontend/dist-copernix`) si existe. `scripts/check-landing.mjs`: si `frontend/dist-copernix` existe, comprueba que `viewer/index.html` referencia solo rutas bajo `/viewer/`.
4. Verifica: `node scripts/check-landing.mjs`, `node scripts/build-landing.mjs`; levanta `python3 scripts/serve_landing.py 4410` y comprueba con `curl -sI` `/`, `/viewer/` y `/api/v1/…` (502 esperado sin API). Sin descargar nada nuevo.
