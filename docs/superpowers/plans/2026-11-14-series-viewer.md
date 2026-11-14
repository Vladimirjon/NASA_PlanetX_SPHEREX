# Series Viewer Implementation Plan

> **For agentic workers:** Native execution in this session (orchestrator approved dive-in).

**Goal:** Time-series view of real SPHEREx frames (blink / difference / colour) for one sky region.

**Architecture:** Hexagonal layers under `frontend/src/series/`: pure `core/`, `ports/`, `adapters/`, thin React `ui/`. Separate `series.html` entry. Do not touch `engine/**` or `ui/**`.

**Tech Stack:** React 19, TypeScript strict, Vite multi-page, Vitest + fast-check, Playwright, openapi-typescript, Canvas2D.

**Spec:** User brief 2026-11-14 + `contracts/openapi.yaml` v0.2 + ADR 0041 + UI norm 07.

## Global Constraints

- Zero `any`; English UI; OBSERVED/EVALUATED only; IBM Plex + tokens; radius ≤ 8 px; body ≥ 16 px; blink ≤ 2.5 Hz; flip FITS rows for north-up display; shared asinh stretch across frames.

## Tasks

1. Scaffold: openapi-typescript, `gen:api`, vite multi-page, series CSS tokens
2. Core TDD: decode, stretch, difference, colour, TAN, blink, URL
3. Adapters: DemoSeriesSource, ApiSeriesSource, Canvas2D renderer
4. React shell: series.html page with full UX/a11y
5. Playwright smoke + screenshots; ADR 0043; frontend/AGENTS.md
6. Verify lint/test/build
