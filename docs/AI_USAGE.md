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
| 2026-11-14 | GitHub Copilot | Resolved merge conflicts of PR #5 (`docs/analysis-impl-plan` vs `main`) | Johann checked nothing was lost |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Revised specs 0010/0011 and ADR 0010 after Johann's review, Sebastián's 2nd message (verified χ² threshold with scipy) and the main triage; read backend layout to avoid duplicating domain code | Mateo reviews; reviewers: Johann, Sebastián, Dax |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Phase 0 for the first delivery: added scope section 0 to spec 0010 (Sebastián's conditions A1–A6), reduced plan 0011 to motion only with reuse of `science/validation.py`, marked ADR 0010 accepted after Dax's and Johann's approval | Mateo reviews; Sebastián approves spec 0010 before any code |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Implemented the first-delivery motion measurement with TDD (domain/measurement, significance moved from Sebastián's code, measure_target use case, AnalysisResult JSON Schema, offline precompute for eps Ind B); ran it on real IRSA/S3 data | Mateo reviews code and result; Sebastián reviews science; Daniel shows it in the UI |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Drafted `contracts/observation.schema.json`, `contracts/package-manifest.schema.json`, examples and `scripts/check_contracts.py`; the real example was generated from a live IRSA query, and the ID rule was tested on 906 real rows | Pending: Johann reviews; Mateo and Daniel review the contract; cross-model review noted in the PR |
