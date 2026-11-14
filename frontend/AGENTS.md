# Frontend: visor SkyShift

En Fedora o Windows, instalar Node 22 o 24 y pnpm; desde `frontend/` ejecutar `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm test` y `pnpm build`. También existen las tareas `mise run web-dev`, `web-lint`, `web-test` y `web-build`. La verificación de navegador `node frontend/smoke.mjs` se ejecuta desde la raíz con el servidor en `127.0.0.1:5173`; `CHROME_PATH` selecciona Chromium.

## Capas y extensiones

- `src/engine/core/` contiene matemáticas y selección puras; no importa adaptadores ni accede al navegador. La prueba `architecture.test.ts` comprueba la frontera.
- `ports/` define interfaces; `adapters/` realiza E/S y dibujado. `engine.ts` conecta las dependencias y emite eventos; React solo presenta controles y llama al motor.
- Una fuente adicional implementa `TileSource.fetch(order, npix, plane, signal)` y se inyecta al crear el motor; el adaptador debe respetar cancelación y cerrar los bitmaps cuando se descarten.
- Una proyección se describe con la interfaz `Projection` y puede registrarse con `createProjectionRegistry(extra)`. La conexión de estrategias al shader aún está pendiente: las tres proyecciones actuales tienen implementaciones explícitas.
- Para otra encuesta HiPS hay que proporcionar fuente de teselas y metadatos verificados (órdenes, dimensiones, frame y planos); los límites y longitudes de onda actuales corresponden específicamente a SPHEREx DR1 y no se pueden reutilizar sin cambiarlos.

Limitaciones actuales y evidencia: `docs/reviews/sky-engine/perf.md` y `docs/adr/0007-motor-cielo-webgl2.md`.
