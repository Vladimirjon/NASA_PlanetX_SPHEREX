# feat: SkyShift end-to-end — temporal SPHEREx analyzer, own sky engine, integrated app

## ES · Resumen
Producto funcional de punta a punta para el reto *Planet X and SPHEREx*:
- **Backend** (`backend/`, FastAPI, arquitectura hexagonal — ADR 0040/0041): cualquier RA/Dec o nombre → serie temporal real de SPHEREx (DR1 + QR3), una imagen por pasada, mismo detector y misma λ local (λ/(4R)), máscara FLAGS, fondo restado, alineada al norte, con semáforo OBSERVED/EVALUATED (nunca CONFIRMED) y procedencia en cada respuesta. Lectura por rangos de S3 (~0,8 MB/imagen). Caché local→IRSA por capas con un cortacircuitos por servicio. Búsqueda tolerante a errores sobre 148 objetos reales (ADR 0044).
- **Frontend** (`frontend/`): app única con mapa del cielo propio en WebGL2 tipo Aladin (HiPS SPHEREx, navegación anclada al cursor, `flyTo` — ADR 0042), rail con los 5 objetos del reto y panel temporal con línea de tiempo, Loop/Diferencia/Color compuesto, explicación simple y capa experta (ADR 0043). Demo offline de los 5 objetos.
- **Ciencia**: `docs/context/12-mapa-de-datos-spherex.md` (qué significa cada dato y reglas de comparación) con verificaciones medidas.
- **Docs del equipo**: specs 0001 y 0010 de main integradas y revisadas (`docs/reviews/2026-11-14-triage-specs-main.md`).

## EN · Summary
End-to-end product for the *Planet X and SPHEREx* challenge: a hexagonal FastAPI backend that turns any RA/Dec or name into a real SPHEREx time series (one image per visit, same detector and local wavelength within λ/(4R), FLAGS-masked, background-subtracted, north-up, OBSERVED/EVALUATED traffic light with full provenance), a typo-tolerant search over 148 real objects, and a single-page app with our own WebGL2 HiPS sky engine (Aladin-like navigation), the 5 challenge targets, and a time panel (timeline, loop/difference/colour composite, plain-language and expert layers).

## How to test / Cómo probar
```bash
mise run api-dev   # http://127.0.0.1:8000/docs
mise run web-dev   # http://127.0.0.1:5173 → click "Barnard's Star"
mise run smoke     # live series for the 5 objects (needs api-dev)
```

## Gates (run on this branch, 2026-11-14)
| Check | Result |
| --- | --- |
| backend `pytest` | 141 passed |
| backend `ruff check` / `ruff format --check` | All checks passed / 59 files formatted |
| backend `pyright` (strict) | 0 errors |
| `contracts/openapi.yaml` | valid, v0.3.0 |
| frontend `pnpm lint` | OK |
| frontend `pnpm build` | OK |
| frontend `pnpm test` | 98 passed, **1 intermittent** (`tests/navigation.test.ts` SIN drag property test fails ~1/3 runs on a large drag near the disc limb at Dec −74°) |
| live smoke, 5 objects | all build series (2–4 visits), cold 8–18 s, cached 1 ms |

## ADR renumbering (team ranges of 10; Dax = 0040–0049)
| Before | After | Topic |
| --- | --- | --- |
| 0006 | 0040 | Base architecture, tiered cache, engines |
| 0008 | 0041 | Architecture and patterns (hexagonal) |
| 0007 | 0042 | Own WebGL2 sky engine |
| 0009 | 0043 | Time-series view |
| — | 0044 | Object search |

## Reviews
Strict reviewers (science, UX, performance, parity) under `docs/reviews/sky-engine/`, `docs/reviews/app/`, `docs/reviews/search/`, `docs/reviews/analyzer/`. Fixed: mirrored sky, duplicate tile requests, per-frame allocations, touch controls, coordinate formatting, single shared circuit breaker. 

## Known gaps / Pendiente
- App search box does not call `/api/v1/search` yet (types already generated).
- App uses its own fly-to tween instead of `engine.flyTo`.
- Intermittent navigation property test (above).
- Visual parity review vs IRSA/Aladin (R1) must be re-run on the new engine.
- UI needs another design round (product owner feedback).
- `frontend/tests/fixtures/healpix-million.bin` is 1.9 MB (test fixture; consider generating at test time).

## AI usage
Claude Code (orchestrator + subagents), Codex and Cursor, logged in `docs/AI_USAGE.md`. All decisions approved by the human owner (specs 0002, 0003, 0040; ADRs).

🤖 Generated with [Claude Code](https://claude.com/claude-code) orchestration (Codex, Cursor)
