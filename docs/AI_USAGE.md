# AI usage log / Registro de uso de IA

Required by NASA Space Apps 2026 ("Use of Super Intelligence") and the Sangolquí rubric (−1 pt if missing). One line per relevant use. AI-generated images/video must carry a visible watermark. No NASA logos generated or modified with AI.

| Date | Tool | Purpose | Human review |
| --- | --- | --- | --- |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Research of challenge rules, data APIs and agent standards; drafting team context docs | Team reads and validates; decisions recorded in ADRs |
| 2026-11-14 | Claude Code (Claude Opus 5.5) + research subagents | Evidence-based skill selection, cross-platform toolchain and stack research; drafting standards (docs/context/05–08, ADRs 0003–0005) | Dax reviews; stack ADR pending team approval |
| 2026-11-14 | Codex (initial draft) + Claude Code (Claude Opus 5.5) | Draft spec `docs/specs/0001-arquitectura-observation.md` (data architecture, proposed `Observation` contract, interfaces, failure states); small read-only IRSA SIA2 queries and FITS header reads (byte ranges, no full downloads) to check fields | Pending: Johann reviews; Mateo and Daniel review the spec; Sebastián reviews scientific requirements; Dax reviews the `Region` boundary |
| 2026-11-14 | Antigravity (gemini-3.8-flash-medium, read-only) + Claude Code (Claude Opus 5.5) | Antigravity drafted proposed answers to the spec's review questions; Claude validated them against official docs and live IRSA data (invented thresholds removed) and ran read-only checks: epochs, per-pixel CWAVE/CBAND, calibration link, IRSA cutouts | Pending: each question's owner decides; answers in spec §6.4 are recommendations only |
