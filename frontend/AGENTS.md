# Frontend: visor SkyShift

En Fedora o Windows, instalar Node 22 o 24 y pnpm; desde `frontend/` ejecutar `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm test` y `pnpm build`. También existen las tareas `mise run web-dev`, `web-lint`, `web-test` y `web-build`. La verificación de navegador `node frontend/smoke.mjs` se ejecuta desde la raíz con el servidor en `127.0.0.1:5173`; `CHROME_PATH` selecciona Chromium.

## Capas y extensiones (sky engine)

- `src/engine/core/` contiene matemáticas y selección puras; no importa adaptadores ni accede al navegador. La prueba `architecture.test.ts` comprueba la frontera.
- `ports/` define interfaces; `adapters/` realiza E/S y dibujado. `engine.ts` conecta las dependencias y emite eventos; React solo presenta controles y llama al motor.
- Una fuente adicional implementa `TileSource.fetch(order, npix, plane, signal)` y se inyecta al crear el motor; el adaptador debe respetar cancelación y cerrar los bitmaps cuando se descarten.
- Una proyección se describe con la interfaz `Projection` y puede registrarse con `createProjectionRegistry(extra)`. La conexión de estrategias al shader aún está pendiente: las tres proyecciones actuales tienen implementaciones explícitas.
- Para otra encuesta HiPS hay que proporcionar fuente de teselas y metadatos verificados (órdenes, dimensiones, frame y planos); los límites y longitudes de onda actuales corresponden específicamente a SPHEREx DR1 y no se pueden reutilizar sin cambiarlos.

**Do not modify `src/engine/**` or `src/ui/**` from app/series work.** Public engine API only: `createSkyEngine`, `setView`, `getView`, `setPlane`, `setProjection`, `on('pick'|'viewchange'|…)`, `destroy` (see `engine.ts`).

Limitaciones del motor: `docs/reviews/sky-engine/perf.md` y `docs/adr/0007-motor-cielo-webgl2.md`.

## Integrated app (primary)

Single product at `/` (`index.html` → `src/main.tsx` → `src/app/`). Left rail = 5 challenge targets; center = sky map; bottom drawer = time series (timeline + cutout + explanation).

**Run (Fedora and Windows):** `pnpm install --frozen-lockfile`, start API on `127.0.0.1:8000`, then `pnpm dev`. Open `/` or `/?target=barnards-star`. Vite proxies `/api` → `VITE_API_PROXY` or `http://127.0.0.1:8000`. Deep-link alias: `/series.html?name=…` redirects into the app as `?target=…`.

**Checks:** `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:app-smoke` (screenshots → `docs/reviews/app/`).

**Layers:**
- `src/app/core/` — targets/slug map, search (incl. sexagesimal), URL state, timeline scale, progress copy
- `src/app/ports/map-controller.ts` + `adapters/engine-map-controller.ts` — fly-to by tweening `setView` (~1.2 s); swap later for native `flyTo`
- `src/app/components/` — search typeahead, challenge cards, segmented controls, band slider, timeline, time panel
- Reuses `src/series/**` (core + Demo/Api/Fallback + Canvas2D). API timeout **60 s**; never send slug to `/resolve` (map to canonical name); pass Gaia/Luhman motion into `/series`.

**URL state:** `?target=` or `?ra=&dec=&fov=&plane=&t=&mode=&proj=`.

ADR: `docs/adr/0009-vista-serie-temporal.md`.

## Series module (library)

Pure cutout pipeline under `src/series/`. Types from `pnpm gen:api` → `src/api/schema.d.ts`. Standalone `series/ui/app.tsx` remains for reference; the product shell lives in `src/app/`. Round-1 screenshots: `docs/reviews/series-viewer/`.
