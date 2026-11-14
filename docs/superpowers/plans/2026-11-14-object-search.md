# Object Search Implementation Plan

**Goal:** Search real catalogued objects and coordinates with typo tolerance and resolver fallback.
**Architecture:** Contract first; pure matching in domain, orchestration in application, JSON and HTTP at adapters/API; preserve target epochs and provenance.
**Tech Stack:** Python 3.13, uv, FastAPI, Hypothesis, defusedxml.
**Spec:** docs/specs/0040-busqueda-objetos.md

## Steps
1. Define and validate OpenAPI 0.3.0; validate limits and provenance at the HTTP boundary.
2. Test and build a pinned, reproducible Sesame catalog generator; retain verified challenge astrometry and report failed requests without fabricating data.
3. Test and implement normalization, deterministic matching, typo tolerance and coordinate parsing in pure domain code.
4. Test and implement catalog-first orchestration, cached Sesame fallback and thin HTTP route.
5. Verify alias ambiguity, incomplete astrometry, invalid coordinates, malformed upstream data and upstream outages; run architecture, pytest, lint, formatting, type checking and live queries.
6. Document scientific limits, provenance, counts and results; review the diff.
