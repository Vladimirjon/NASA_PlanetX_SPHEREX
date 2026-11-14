# backend/ — SkyShift API (Python 3.13, FastAPI, uv)

Arquitectura obligatoria: ADR 0041 (hexagonal). Caché por capas: ADR 0040. Contrato: `contracts/openapi.yaml`.

```
src/skyshift/
  domain/        valores validados y funciones puras (sin I/O, sin dependencias externas)
  ports/         interfaces (Protocol) y errores del contrato de origen
  application/   casos de uso + TieredResolver (memoria → precalculado → disco → IRSA)
  adapters/      IRSA, disco local, (Redis/SQLite, Sesame…) — todo lo impuro
  api/           FastAPI + problem+json; app.py::create_app es la raíz de composición
  config.py      variables SKYSHIFT_* (sin secretos)
```
`tests/test_architecture.py` falla si una capa importa otra prohibida.

## Correr (Fedora y Windows, igual)
```
mise run api-dev     # http://127.0.0.1:8000/api/v1/health
mise run api-test
mise run api-lint
```
Sin mise: `uv run --directory backend pytest` (y equivalentes del `mise.toml`).

Variables: `SKYSHIFT_CACHE_DIR` (por defecto `.cache/skyshift`), `SKYSHIFT_PRECOMPUTED_DIR`, `SKYSHIFT_CORS_ORIGINS` (JSON, ej. `["http://localhost:5173"]`), `SKYSHIFT_UPSTREAM_TIMEOUT_S`, `SKYSHIFT_MEMORY_CACHE_MB`, `SKYSHIFT_HIPS_MAX_PARALLEL` (1–32, por defecto 6).

## Cómo extender
- Nueva fuente: puerto en `ports/` (si no existe) + adaptador en `adapters/` + conexión en `create_app`. El dominio no se toca.
- Nuevo endpoint: primero `contracts/openapi.yaml`, luego caso de uso en `application/`, handler delgado en `api/`.

## Búsqueda de objetos
`GET /api/v1/search?q=...&limit=10` acepta nombres, alias y coordenadas; usa primero el catálogo local y después Sesame con caché de 30 días. Los resultados incluyen época y procedencia. Regenera el catálogo con `uv run --python 3.13 --locked --script scripts/build-popular-catalog.py` desde la raíz; las omisiones quedan en `docs/reviews/search/catalog-build.md`. El marco J2000 no demuestra la época de observación: no propagar movimiento sin época de referencia conocida.
