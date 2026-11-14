---
name: scientific-charts
description: Team rules for any scientific chart or astronomical image display in SkyShift (light curves, spectra, epoch comparisons, difference images, colormaps). Use BEFORE writing chart/visualization code or choosing colors for data, and when reviewing a chart or image view.
---

# Scientific charts and image display (SkyShift team standard)

Project skill (not vendored). Applies to Observable Plot charts, WebGL image views and exported figures/slides. Full UI rules: `docs/context/07-estandar-ui.md`.

## Non-negotiable
1. Real data only. Never plot synthetic/illustrative values unless the chart is visibly labeled "Illustrative".
2. Every chart/image shows: data source (e.g. "SPHEREx DR1 · IRSA"), observation date(s), wavelength/band.
3. Axes always have units: µm, MJD or ISO date, arcsec (″), flux unit as delivered by the FITS header. No unitless axes.
4. Show uncertainty when it exists (from the VARIANCE extension → σ = √variance). If absent, say "no uncertainty available".
5. Honest ranges: do not truncate axes to exaggerate change; declare log or asinh scaling in the axis label.
6. Interpretation level (traffic light) next to any claim: Observed / Evaluated / Confirmed. Software never sets "Confirmed".

## Chart choice
| Question | Chart |
| --- | --- |
| Brightness over time (variable star) | Light curve: dots + error bars (`Plot.dot` + `Plot.ruleX`/`ruleY`), x = date, connect only if cadence justifies it |
| Brightness vs wavelength | Spectrum: dots + error bars, x = µm, facet or color by detector D1–D6 |
| Position change | Image view (blink / difference / epoch composite) + measured shift text in px and ″ |
Forbidden: pie/donut, 3D, dual y-axes, stacked areas for this data, rainbow/jet colormaps, drop shadows, gradients, decorative gridlines.

## Style
- Minimal ink: no chart background, faint or no grid, direct labels over legends when possible.
- IBM Plex Sans for labels, IBM Plex Mono + tabular numerals for tick values and readouts.
- Colors from design tokens only; one categorical palette that is colorblind-safe (validate contrast ≥ 3:1 against background for marks).
- Image colormaps: grayscale + asinh stretch by default; cividis/viridis optional. Difference images: diverging map centered at 0 with a colorbar. Two-epoch composite: magenta/green or orange/blue, always labeled "E1 / E2".
- Pixels: nearest-neighbour zoom (`image-rendering: pixelated` / NEAREST textures). Never smooth or enhance data.

## Accessibility
- Every chart has a text alternative summarizing the key value (e.g. "Brightness rose 0.8 mag between 2025-09 and 2026-03").
- Do not encode meaning by color alone; add shape or label.
- Charts are keyboard-reachable; values readable on focus/hover.

## Done checklist
- [ ] Source, date, λ visible · [ ] units on all axes · [ ] uncertainty shown or declared · [ ] no forbidden chart types/colors · [ ] text alternative · [ ] screenshot in light and dark/projector theme attached to PR.
