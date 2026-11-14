# Frontend: visor SkyShift

En Fedora o Windows, instalar Node 22 o 24 y pnpm; desde `frontend/` ejecutar `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm test` y `pnpm build`. También existen las tareas `mise run web-dev`, `web-lint`, `web-test` y `web-build`. La verificación de navegador `node frontend/smoke.mjs` se ejecuta desde la raíz con el servidor en `127.0.0.1:5173`; `CHROME_PATH` selecciona Chromium.

## Capas y extensiones

- `src/engine/core/` contiene matemáticas y selección puras; no importa adaptadores ni accede al navegador. La prueba `architecture.test.ts` comprueba la frontera.
- `ports/` define interfaces; `adapters/` realiza E/S y dibujado. `engine.ts` conecta las dependencias y emite eventos; React solo presenta controles y llama al motor.
- Una fuente adicional implementa `TileSource.fetch(order, npix, plane, signal)` y se inyecta al crear el motor; el adaptador debe respetar cancelación y cerrar los bitmaps cuando se descarten.
- Una proyección se describe con la interfaz `Projection` y puede registrarse con `createProjectionRegistry(extra)`. La conexión de estrategias al shader aún está pendiente: las tres proyecciones actuales tienen implementaciones explícitas.
- Para otra encuesta HiPS hay que proporcionar fuente de teselas y metadatos verificados (órdenes, dimensiones, frame y planos); los límites y longitudes de onda actuales corresponden específicamente a SPHEREx DR1 y no se pueden reutilizar sin cambiarlos.

Limitaciones actuales y evidencia: `docs/reviews/sky-engine/perf.md` y `docs/adr/0007-motor-cielo-webgl2.md`.

## Series view

Time-series page (SPHEREx Float32 cutouts), separate from the HiPS sky engine. Do not modify `src/engine/**` or `src/ui/**` from series work.

**Run (Fedora and Windows):** from `frontend/` after `pnpm install --frozen-lockfile`: `pnpm gen:api`, `pnpm dev`, open `/series.html?name=barnards-star` (or `epsilon-indi-b`). Optional live API: set `VITE_API_BASE` (default same origin; Vite proxies `/api` → `VITE_API_PROXY` or `http://127.0.0.1:8000`). If the API is down, DemoSeriesSource serves `public/demo/` and the UI states that clearly. Checks: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:series-smoke` (Chromium via `CHROME_PATH` if needed).

**Layers:** `src/series/core/` pure (decode, shared asinh stretch, difference, magenta/green composite, TAN east-left, blink clamp, URL) · `ports/series-source.ts` · `adapters/` (Demo, Api, Fallback, Canvas2D) · `ui/app.tsx` thin React shell. Types: `src/api/schema.d.ts` from `contracts/openapi.yaml` — never hand-write API types.

**Extension points:** new data backend → implement `SeriesSource` and inject in the provider; new comparison mode → pure function in `core/` + renderer branch; deep links via `parseSeriesSearch` / `toSeriesSearch`. ADR: `docs/adr/0009-vista-serie-temporal.md`. Screenshots: `docs/reviews/series-viewer/`.
