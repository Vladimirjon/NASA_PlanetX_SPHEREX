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
| 2026-11-14 | Claude Code (Claude Opus 5.5) + agente físico | Verificación de épocas reales en IRSA (DR1+QR3) de los 5 objetos; ADR 0006, contrato OpenAPI v0.1, fichas 0002/0003; mapa de datos SPHEREx (docs/context/12) | Dax aprueba ADR y fichas; ciencia revisada por el rol de física |
| 2026-11-14 | Codex (initial draft) + Claude Code (Claude Opus 5.5) | Draft spec `docs/specs/0001-arquitectura-observation.md` (data architecture, proposed `Observation` contract, interfaces, failure states); small read-only IRSA SIA2 queries and FITS header reads (byte ranges, no full downloads) to check fields | Pending: Johann reviews; Mateo and Daniel review the spec; Sebastián reviews scientific requirements; Dax reviews the `Region` boundary |
| 2026-11-14 | Antigravity (gemini-3.8-flash-medium, read-only) + Claude Code (Claude Opus 5.5) | Antigravity drafted proposed answers to the spec's review questions; Claude validated them against official docs and live IRSA data (invented thresholds removed) and ran read-only checks: epochs, per-pixel CWAVE/CBAND, calibration link, IRSA cutouts | Pending: each question's owner decides; answers in spec §6.4 are recommendations only |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Research for the measurements module: read SPHEREx Explanatory Supplement v2.0 and IRSA tutorials, queried IRSA SIA2/Gator for real epochs and magnitudes, exploratory centroid/flux probe on real eps Ind B cutouts (λ from CWAVE/CBAND); drafted `docs/specs/0010-analysis-result.md` aligned with `Observation` 0001 | Mateo reviews; Sebastián and Johann review contract and science rules before approval |
| 2026-11-14 | Codex | Integración documental y revisión de fichas de main contra contrato, código y D12 | Revisión humana y científica pendientes |
