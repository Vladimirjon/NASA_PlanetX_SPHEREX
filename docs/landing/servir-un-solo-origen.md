# Servir landing + visor + API en un solo origen

Decisión operativa del encargo Cursor 03 (2026-11-14).

| Ruta | Origen |
| --- | --- |
| `/` y estáticos de la landing | `landing/` |
| `/viewer/` | `frontend/dist-copernix/` (o página con `mise run copernix-build`) |
| `/api/*` | proxy a `http://127.0.0.1:8000` (timeout 65 s) |

- Desarrollo: `mise run copernix` (`scripts/run_copernix.py` espera `GET /api/v1/health`).
- Solo estáticos + proxy sin API: `mise run landing` → `502` JSON `{"error":"api_unavailable"}` si la API no está arriba.
- Empaquetado: `node scripts/build-landing.mjs` copia el visor a `dist/landing/viewer/` cuando el build existe.

Verificación habitual: `node scripts/check-landing.mjs`, `node scripts/build-landing.mjs`, `curl -sI http://127.0.0.1:4410/` y rutas `/viewer/` y `/api/v1/health`.