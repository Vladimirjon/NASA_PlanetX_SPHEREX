# Recorrido D2 → D3 → D2 de ε Indi B (revisión del PR #16)

14-nov-2026 · Mateo + Claude Code · Base `main` `091f16c` (merge del PR #16, ya fusionado). Visor anterior (`frontend/src/app`), API local en `:8000` y Vite en `:5173`, en Windows 11.

## Resultado

| Paso | Resultado | Evidencia |
| --- | --- | --- |
| D2 desde la API | **OK.** 4 visitas, 1,336 µm, «Live series from API». | `resolve`, `series` y `frames/0..3` → 200 (red del navegador y log de uvicorn). |
| Explore D3 comparison | **OK.** Solo archivos precalculados: `/demo/epsilon-indi-b-d3/{series,case}.json`, `frame-0.f32`, `frame-1.f32`; ninguna llamada nueva a `/api/`. | Lista de recursos del navegador. |
| Fechas D3 | **OK.** Image A 2025-06-10 (DR1, 1,934121 µm) e Image B 2026-09-28 (QR3, 1,933310 µm). Coinciden con los IDs de `case.json`. | Texto de la página y `case.json`. |
| Enlaces a IRSA | **OK.** Los dos FITS responden 200 (≈ 66 MB cada uno). | `curl -I` a los `access_url` de A y B. |
| 6,05″ | **OK.** «Observed · motion candidate», incertidumbre ±0,43″ por eje y componentes 5,19″ E / 3,10″ S. | Cajón «Inspect pair evidence». |
| Regreso a D2 | **Funciona, con una diferencia:** carga la serie **grabada** (`/demo/epsilon-indi-b/`, «Recorded data (offline)»), no la API. Es intencional en `app.tsx:396` (`'recorded'`); la spec 0038 no fija el origen. | Recursos del navegador tras el clic. |
| 503 | **No hubo.** Dos recorridos (en frío y con caché), todas las respuestas 200. Sin reintentos que medir. | Log de uvicorn sin 503. |
| Pruebas | Lint y build OK. Vitest: la 1.ª corrida falló sin registrar qué prueba; las 4 siguientes 102/102. Smoke D3 (`d3-case-smoke.mjs`) OK: teclado, dos observaciones, evidencia, regreso, móvil y archivos faltantes. | Salida de `pnpm test`, `pnpm lint`, `pnpm build` y del smoke. |
| Despliegue | **No existe.** Sin configuración de deploy en ninguna rama, `has_pages: false`, sin deployments y `vladimirjon.github.io/NASA_PlanetX_SPHEREX/` → 404. Pendiente repetir el recorrido en la URL pública. | API pública de GitHub. |

## Nota

Copernix (PR #17) no incluye el caso D3: muestra el ajuste de 4 pasadas (6,6″). Ver `docs/reviews/regions/2026-11-14-cinco-regiones.md`.
