# AI usage log / Registro de uso de IA

Required by NASA Space Apps 2026 ("Use of Super Intelligence") and the Sangolquí rubric (−1 pt if missing). One line per relevant use. AI-generated images/video must carry a visible watermark. No NASA logos generated or modified with AI.

| Date | Tool | Purpose | Human review |
| --- | --- | --- | --- |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Research of challenge rules, data APIs and agent standards; drafting team context docs | Team reads and validates; decisions recorded in ADRs |
| 2026-11-14 | Claude Code (Claude Opus 5.5) + research subagents | Evidence-based skill selection, cross-platform toolchain and stack research; drafting standards (docs/context/05–08, ADRs 0003–0005) | Dax reviews; stack ADR pending team approval |
| 2026-11-14 | Codex | Investigación de región, caché y descarga experimental de recortes IRSA; ficha borrador | Revisión humana y científica pendientes |
| 2026-11-14 | Codex | Análisis de capturas de IRSA y fuentes oficiales; guía de investigación para explorar todo el cielo | Revisión del equipo pendiente |
| 2026-11-14 | Codex | Índice experimental de celdas HiPS a partir de metadatos oficiales y ejemplo IRSA | Validación humana y científica pendiente |
| 2026-11-14 | Codex y agentes revisores | Investigación y validación geométrica HiPS, protocolo reproducible y descarga experimental de un cubo | Validación humana y científica pendientes |
| 2026-11-14 | Codex y agente revisor | Generador reproducible HiPS, pruebas geométricas y contraste puntual con IRSA | Dax aprobó ficha base; revisión científica y multiplataforma pendientes |
| 2026-11-14 | Codex y agentes revisores | Prototipo local de mapa HiPS, pruebas visuales y comparación con IRSA; revisión de caché | Revisión humana, científica y multiplataforma pendientes |
| 2026-11-14 | Codex y agentes revisores | Renderizador propio experimental de esfera HiPS, verificación de orientación y pruebas de interacción | Revisión científica y humana pendientes |
| 2026-11-14 | Codex | Inventario de prototipos, datos locales y brecha frente a IRSA | Revisión humana y científica pendientes |
| 2026-11-14 | Claude Code (Claude Opus 5.5) + agente físico | Verificación de épocas reales en IRSA (DR1+QR3) de los 5 objetos; ADR 0040, contrato OpenAPI v0.1, fichas 0002/0003; mapa de datos SPHEREx (docs/context/12) | Dax aprueba ADR y fichas; ciencia revisada por el rol de física |
| 2026-11-14 | Codex (initial draft) + Claude Code (Claude Opus 5.5) | Draft spec `docs/specs/0001-arquitectura-observation.md` (data architecture, proposed `Observation` contract, interfaces, failure states); small read-only IRSA SIA2 queries and FITS header reads (byte ranges, no full downloads) to check fields | Pending: Johann reviews; Mateo and Daniel review the spec; Sebastián reviews scientific requirements; Dax reviews the `Region` boundary |
| 2026-11-14 | Antigravity (gemini-3.8-flash-medium, read-only) + Claude Code (Claude Opus 5.5) | Antigravity drafted proposed answers to the spec's review questions; Claude validated them against official docs and live IRSA data (invented thresholds removed) and ran read-only checks: epochs, per-pixel CWAVE/CBAND, calibration link, IRSA cutouts | Pending: each question's owner decides; answers in spec §6.4 are recommendations only |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Research for the measurements module: read SPHEREx Explanatory Supplement v2.0 and IRSA tutorials, queried IRSA SIA2/Gator for real epochs and magnitudes, exploratory centroid/flux probe on real eps Ind B cutouts (λ from CWAVE/CBAND); drafted `docs/specs/0010-analysis-result.md` aligned with `Observation` 0001 | Mateo reviews; Sebastián and Johann review contract and science rules before approval |
| 2026-11-14 | Codex | Integración documental y revisión de fichas de main contra contrato, código y D12 | Revisión humana y científica pendientes |
| 2026-11-14 | Codex | Ficha aprobada e implementación de búsqueda local y Sesame con pruebas | Dax aprobó ficha; revisión de código y ciencia pendientes |

| 2026-11-14 | Cursor (Composer) | Ronda 3 motor cielo: proyección fija SIN/TAN/AIT, arrastre keep-under-pointer, zoom anclado, flyTo, inercia, tests y remediación perf | Product owner / orchestrator; evidencia en docs/reviews/sky-engine |

| 2026-11-14 | Cursor (Composer) | Implementación vista serie temporal SPHEREx (`frontend/src/series/`, demo+API, Canvas2D, ADR 0043) | Orquestador aprobó diseño; humano revisa capturas en docs/reviews/series-viewer/ |
| 2026-11-14 | Cursor (Composer) | App integrada mapa+timeline+5 targets (`frontend/src/app/`), fix timeout 60s y slug→canónico | Orquestador aprobó ronda 2; humano revisa docs/reviews/app/ |
| 2026-11-14 | Claude Code (orquestador) + Codex + Cursor | Integración de ramas (backend, motor del cielo, app, búsqueda), renumeración de ADRs 0040–0044, revisión de commits y PR | Dax revisa el PR antes del merge |

| 2026-11-14 | Claude Code (Claude Opus 5.5) | Drafted TDD implementation plan `docs/specs/0011` and stack ADR `docs/adr/0010` (versions resolved with `uv pip compile`); no product code written | Mateo reviews; Johann agrees on folder; runs only after spec 0010 is approved |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Drafted `contracts/observation.schema.json`, `contracts/package-manifest.schema.json`, examples and `scripts/check_contracts.py`; the real example was generated from a live IRSA query, and the ID rule was tested on 906 real rows | Pending: Johann reviews; Mateo and Daniel review the contract; cross-model review noted in the PR |
| 2026-11-14 | Claude Code (Claude Sonnet 5.5) | Built the landing page in `landing/` from the team sketch (code, ES/EN copy, palette, method and five-objects sections); wrote `scripts/serve_landing.py` and `scripts/prepare_landing_images.py` | Daniel reviews copy and science statements; speeds (″/yr) are from `docs/context/02` and still need checking against Gaia DR3 |
| 2026-11-14 | ChatGPT Images (OpenAI) | Six artist's-concept illustrations: hero backdrop and WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae, R Draconis (`landing/assets/`). Prompts in `docs/landing/prompts-imagenes-chatgpt.md`. Marked "AI illustration" on the page and burned-in on the object images; not used as data | Pending: a team member checks each one against the AGENTS.md §4 rules (no NASA logos, no look-alike data) |

| 2026-11-14 | Codex (OpenAI) + ChatGPT Images (built-in image_gen) | Investigated Intel i915 GPU hang; replaced automatic WebGL/background rendering with event-driven rendering; redesigned pitch landing; generated two watermarked concept images and integrated credited NASA/JPL-Caltech artwork; tests, lint, static build and accessibility checks | Requested by Daniel; human visual/science review pending. Prompts: docs/landing/prompts-premium-2026-11-14.md |

| 2026-11-14 | Codex (OpenAI) | Reverted the rejected landing redesign at Daniel’s request; preserved original scroll and visuals; CPU-prerendered the existing NASA/JPL-Caltech satellite model (not AI-generated imagery); bounded rendering and image cache; regression tests | Original design explicitly requested by Daniel; driver stability on physical GPU not stress-tested |

| 2026-11-14 | Codex | Restructured only the method section into a visual sequence; retained original scroll and rendering safeguards | Requested by Daniel; visual review pending |

| 2026-11-14 | Codex | Alternating object layout, per-letter hero entrance, bounded scene timing and interpolation of existing satellite views; GPU-disabled browser QA | Requested by Daniel; physical driver stability not stress-tested |

| 2026-11-14 | Codex | Centered method section and corrected continuous alternating object images across groups | Requested by Daniel; visual review pending |

| 2026-11-14 | Codex | Reviewed MDN/Emscripten WebGL guidance; optimized existing 2D scheduler, removed reentrant timer duplication, added adaptive active-scene cadence and regression coverage | Requested by Daniel; physical GPU not exercised |

| 2026-11-14 | Codex | Removed hero artwork; measured actual canvas draws, removed background 8–10 Hz throttle and 20 Hz scene timers, reduced cloud-buffer cost; GPU-disabled QA | Requested by Daniel; physical display performance remains device-dependent |
| 2026-11-14 | ChatGPT Images + Claude Code | Campo de estrellas base (solo estrellas) generado con ChatGPT Images; `scripts/make_method_frames.py` copia una estrella para crear los cuadros «antes» y «después» y calcula el de diferencia. Línea ondulada de los 4 pasos, objetos sin cifras, chips sin recuadro, tooltip opaco | Pedido por Daniel; los tres cuadros son un esquema (la página lo rotula así y declara el uso de IA), no datos de SPHEREx |
| 2026-11-14 | Claude Code | Satélite: 840 vistas (120 giros × 7 inclinaciones) renderizadas offline por CPU con `scripts/render_satellite_views.py` (SwiftShader; el script aborta si WebGL no es por software); `sat3d.js` mezcla vistas vecinas, precarga la fila actual y desliza con inercia, sin WebGL. CTA del menú sólido, marcos de imágenes y badge «IA» quitados | Pedido por Daniel; no se probó sobre la GPU física, el modelo sigue siendo el original de NASA/JPL-Caltech |
| 2026-11-14 | Cursor CLI | Encargo landing/cursor/01: renombrar producto a Copernix, CTAs a `/viewer/` con slugs TARGET_SLUG, enlaces «Verlo en Copernix», eliminado VIEWER_READY/toast.cta; check + tests landing | Daniel: revisar copy del pie ES/EN y que `/viewer/` responde con el visor

>> | 2026-11-14 | Cursor CLI | Encargo landing 03: servidor unificado (`serve_landing.py`, `run_copernix.py`), tareas `copernix`/`copernix-build`, empaquetado `dist/landing` + proxy `/api` | Daniel: revisar `mise run copernix` en vivo y `copernix-build` cuando exista el visor |
>> | 2026-11-14 | Cursor CLI | Cerrado encargo 03 (servir/empaquetar); verificado `check-landing.mjs`, `build-landing.mjs`, curl `/` 200, `/viewer`→301, `/viewer/` placeholder, `/api/v1/health` 502 JSON sin API | Daniel: placeholder ES del visor y `mise run copernix` con API en marcha |

>> | 2026-11-14 | Cursor CLI | Encargo landing/cursor/02: visor Copernix en frontend/copernix/ (Vite base /viewer/, tokens landing, i18n ES/EN, mapa+dock+semáforo; reutiliza app/core+series+motor); lint/test/build:copernix OK; capturas docs/landing/copernix-qa/ | Daniel: revisar visual ES/EN escritorio/móvil y ?map=off en GPU Intel

>> | 2026-11-14 | Cursor CLI | Encargo landing/cursor/04: pulir visor Copernix (panel lateral opaco, barra única, dock/legibilidad, sheet móvil, explain-i18n ES/EN); lint/test/build:copernix + check-landing OK; capturas revision2-* | Daniel: revisar visual ES/EN escritorio/móvil
>> | 2026-11-14 | Cursor CLI | Encargo landing/cursor/05: rediseño editorial del visor (scrim, sin paneles azules, selection.ts target/candidate/custom, marcador fijo); lint/test/build:copernix + check-landing + copernix-qa SwiftShader OK; capturas revision3-* | Daniel: revisar visual revision3 y flujo candidato→Analizar→Volver
>> | 2026-11-14 | Cursor CLI | Encargo landing/cursor/06: catálogo abierto (port+api/featured, ?name=, tipos SIMBAD), controles legibles, guía intro 3 pasos; lint/test/build:copernix + check-landing + copernix-qa-catalog OK; capturas revision4-* | Daniel: revisar búsqueda Proxima/Sirius, guía y textos de modos
>> | 2026-11-14 | Cursor CLI | Encargo landing/cursor/07: solapes visor (dock en hueco, timeline/guía/zoom, placeholder buscador, overlap-check 6 viewports); lint/test/build + capturas revision5-* | Daniel: revisar 1366×680 y guía paso 1–3
| 2026-11-14 | Claude Code (orquesta) + Cursor CLI (Composer 2.5 y Grok 4.5) | Renombrado a Copernix, CTA hacia `/viewer/`, visor Copernix con UI propia sobre la plataforma, servidor unificado y 1.620 vistas del satélite. Encargos en `docs/landing/cursor/`; revisión de Claude con capturas SwiftShader y pulido en una segunda ronda | Pedido por Daniel; revisión visual humana y prueba en la GPU real pendientes. Cursor se autenticó con la cuenta daxrpm@gmail.com |
