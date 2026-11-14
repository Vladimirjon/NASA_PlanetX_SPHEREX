# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: React + TypeScript (strict) on Vite; TanStack Router (sky position and view state live in the URL), TanStack Query (fetching, caching, streamed frames), Zustand (player state), Radix primitives (accessible controls), WebGL2 for all image display math (stretch, colormap, blink, difference, D1–D6 color composite), Observable Plot for spectral profile and light curve, Aladin Lite v3 as a secondary sky-context view. Deployed to GitHub Pages.
- Backend: Python 3.12, FastAPI + Pydantic, httpx (async), astropy, reproject, numpy; disk cache; Docker on Hugging Face Spaces (free CPU tier). OpenAPI schema generates the TypeScript client types.
- Versions are pinned at install time on Saturday (uv lock, package-lock.json, exact CDN versions). Chosen by the team on 2026-11-13.

## Users

Primary: members of the general public who are curious about the sky but have no astronomy training. They arrive from the NASA Space Apps project page, a shared link, or a demo, and want to see with their own eyes that something in the sky moved or changed.

Secondary: the hackathon judges (local jury in Sangolquí and the global NASA Space Apps review), who evaluate impact, creativity, validity, relevance and presentation in about five minutes, often on a projector.

Tertiary: amateur and student astronomers who know RA/Dec and want to check any position quickly.

## Product Purpose

A public web tool that takes a sky position (RA/Dec, or an object name as a helper), finds every SPHEREx observation of that spot in the NASA/IPAC archive (IRSA), aligns them on a common grid at a comparable wavelength, and plays them as a blink sequence so a person can spot objects that move or change brightness. Success: a first-time visitor sees Barnard's Star or WISE 0855 shift between epochs, and understands what they are seeing, within a minute.

## Positioning

The only blink viewer built on SPHEREx's spectral images that treats wavelength honestly: every frame in a sequence is compared at the same wavelength, because SPHEREx's linear variable filter means two raw images of the same star can differ in brightness only because they sampled different colors. It also uses the 102-band nature of the mission (D1–D6 profile) instead of showing grayscale frames only. Existing blink tools (WiseView) use WISE data, not SPHEREx.

## Operating Context

- Demoed live on a projector in a coliseum with unreliable Wi-Fi; a precomputed gallery of the five challenge objects must work offline from the static site.
- Data comes live from IRSA (TAP `spherex.obscore`, IBE cutouts); each cutout takes 8–10 s and ~4 MB, IRSA sends no CORS headers, so the backend is mandatory and frames stream in one by one.
- Built in about 25 hours (Sat 14 Nov 09:00 to Sun 15 Nov 10:30, 2026) by five students.

## Capabilities and Constraints

- Required by the challenge: RA/Dec input, a time series of SPHEREx images of that region, presented like a short video, easy identification of moving objects; tested on Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis.
- Measured facts (2026-11-13): 3–5 epochs per object between May 2025 and Oct 2026; pixel scale 6.2″; target motion is 1–2 px across the whole series; catalog positions must be propagated with proper motion (Barnard is ~4.3′ from its J2000 position).
- Optional ideas from the challenge to pursue after the minimum: image difference, field-of-view choice, Gaia/WISE overlays, coordinates in the URL, contamination flags, weekly data refresh, per-detector views.
- Out of scope: AI detection, full 102-band spectra, user accounts.
- Undecided: product name.

## Brand Commitments

- Team name: Na za. Interface language: English only.
- Must credit SPHEREx, IRSA and the dataset DOI with the acknowledgement text IRSA requests. Data images are SPHEREx; any WISE or other imagery must be labeled as such.

## Evidence on Hand

- Real SPHEREx data reachable through IRSA for all five test objects (counts and windows in `docs/plan_tecnico.md`).
- No user testimonials, no prior users, no detections. The product must never claim a discovery; it shows the expected motion of known objects.

## Product Principles

1. Truthful pixels: every frame shows real SPHEREx data with its date, wavelength and quality flags one glance away; nothing is smoothed or invented to look better.
2. Comparable or not shown: frames in a blink are matched in wavelength, or the interface says they are not.
3. A newcomer first, an astronomer one layer down: plain language and one-click examples on top, RA/Dec, detectors and FITS metadata in an advanced layer.
4. Never a dead wait: frames appear as they arrive, with honest progress, and a precomputed fallback exists for every demo object.
5. Linkable state: every view is a URL someone can share.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Blink and animation must be pausable and respect reduced-motion settings (offer side-by-side and difference views instead of flashing). Colormaps must be perceptually uniform and readable with color-vision deficiencies. Must stay legible on a projector.
