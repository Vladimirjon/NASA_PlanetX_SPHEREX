# Planet X and SPHEREx (NASA Space Apps 2026): Research Foundation, Architecture Decision and Implementation Handoff

The strongest solution is a public "infrared blink comparator plus honest moving-object finder": a static-first web tool that streams small cutouts of real SPHEREx Level-2 images from IRSA, lets anyone blink any sky patch across epochs, flags movers that are checked against JPL's known-object catalog, and states plainly, with measurements, why SPHEREx is very unlikely to detect a Planet Nine itself. It should not be a Planet Nine discovery engine. The challenge asks for a public tool showing how the sky changes. The published physics shows a Planet Nine is far below SPHEREx's single-visit depth in reflected light and, in most atmospheric models, in thermal emission too. Teams that build a rigorous, traceable, well-explained change viewer will beat teams that build an elaborate Planet X search.

## TL;DR

- **What to build:** a static-first web app. An offline Python pipeline (astropy, astroquery/pyvo, photutils, numpy) precomputes curated fields, candidate movers and injection-recovery statistics. The browser blinks cutouts fetched on demand, and a thin serverless proxy makes the JPL calls (sb_ident, Horizons) using SPHEREx's own orbital position. No GPU, no database and no n-body engine are needed for the core deliverable.
- **Why not hunt Planet X directly:** the best published Planet Nine estimate (Pan-STARRS1 search) puts it at about 550 au and V > 21. Pre-launch, the SPHEREx Sky Simulator (Crill et al. 2025) predicted a single-visit 5σ depth of only m_AB 18.5–19 from 0.75 to 3.8 µm, "limited by the zodiacal light background at all wavelengths". WISE already limits its 3.4 µm brightness to W1 > 16.7 (Vega). Distant objects are also near their stationary points at SPHEREx's roughly 90° solar elongation. The scientifically honest "Planet X mode" is to demonstrate the method on real distant dwarf planets (Makemake, Haumea, Eris) and report detection limits from synthetic injection.
- **Key uncertainty:** the official challenge page (statement, resources, judging criteria) blocks automated access and could not be read verbatim. Requirements below are reconstructed from secondary sources and must be checked against the live page at kickoff (Nov 14, 2026, 9:00 local). Space Apps rules ask teams not to build the actual solution before kickoff, so this document is research only.

---

## 1. Challenge Analysis and Requirements Traceability

### 1.1 What is verified about the challenge

| Item | Status | Evidence |
|---|---|---|
| Official URL | Exists; automated fetch refused (robots) | spaceappschallenge.org/2026/challenges/planet-x-and-spherex/ (title and image alt text only: "Illustration of the SPHEREx spacecraft above Earth") |
| Summary text | Secondary, near-verbatim | Team repo quote: "Since 2025, NASA's SPHEREx mission has mapped the entire sky every six months in 102 bands of near-infrared light, imaging more than a billion objects. Comets, asteroids, stars, brown dwarfs, and even new planets reveal themselves by shifting position between images — but no one person can sift through all that data alone." Task: "a public-facing web tool that makes it easy for anyone to see how the sky changes over time." |
| Space Apps social summary | Secondary | "Build a time-lapse sky viewer for the SPHEREx mission." |
| NASA framing of 2026 astrophysics challenges | Secondary (NASA Science) | Improving public access to mission data, "designing tools that help visualize changes in the sky over time," supporting engagement with mission data products |
| Timeline | Verified (Space Apps FAQ and NASA announcement) | Summaries Sep 17; full statements Oct 28; hackathon Nov 14–15, 2026; judging begins Nov 16; Judging and Awards Guide released Nov 13 |
| Number of challenges | Secondary | 14 challenges in 2026 |
| Judging criteria | **Not verified** | Only a team's shorthand: "Science · Data access · Innovation (no hallucinations) · Impact · Plausibility · Storytelling · Global connection · Craft" |
| Official resource list | **Not verified** | Teams uniformly use IRSA SPHEREx (SIA2, cutouts, S3), JPL SBIdent/Horizons; treat as likely but unconfirmed |

**Implication:** the core requirement is clear and consistent across every source: a *public-facing web tool* that shows *how the sky changes over time* using *SPHEREx* data. "Planet X" is the motivation and the hook, not a measurable deliverable.

### 1.2 Requirements (reconstructed) with traceability

| ID | Requirement | Type | Source confidence | Design element |
|---|---|---|---|---|
| R1 | Public, non-expert-friendly web tool | Mandatory | High | Static web app, guided "stories", glossary |
| R2 | Uses real SPHEREx data | Mandatory | High | IRSA SIA2/TAP + cutout service + S3 mirror |
| R3 | Shows change over time (multi-epoch comparison) | Mandatory | High | Blink / swipe / difference / time-coloured trail viewer |
| R4 | Supports finding movers (comets, asteroids, brown dwarfs, "new planets") | Mandatory (core idea) | High | Mover detection + JPL known-object overlay |
| R5 | Scientific honesty about Planet X | Strongly implied (judges, "no hallucinations") | Medium | Detection-limit page, injection-recovery, explicit non-claims |
| R6 | Provenance of every frame (file, time, wavelength, release) | Exceptional-solution | Medium | Provenance panel, DOI citation |
| R7 | Spectral dimension (102 bands) surfaced | Optional | Medium | Per-object spectrum from LVF wavelengths |
| R8 | Citizen participation (flag movers) | Optional | Low | Flagging UI and export (ADES draft) |
| R9 | Accessibility, global reach, multilingual | Optional | Low | i18n strings, low-bandwidth mode |

### 1.3 What an exceptional solution looks like

1. Real data end to end, with every pixel traceable to an IRSA file, observation ID, timestamp, detector and calibrated wavelength.
2. Correct physics in the viewer. It must handle wavelength-matched comparisons on the linear variable filter (LVF), SPHEREx's low-Earth-orbit (LEO) vantage point for ephemerides, and flag-aware masking.
3. Quantified capability: a completeness-versus-magnitude-and-rate curve from synthetic injection into real frames, plus known-asteroid recovery statistics.
4. An honest Planet X narrative: "here is how SPHEREx would see a distant planet (shown on Makemake at 52.7 au), and here is why Planet Nine is beyond reach."
5. Fast for the public: first frame in a few seconds, no login, works on a phone.

---

## 2. Authoritative Source Registry

| # | Source | What it provides | Access date |
|---|---|---|---|
| S1 | IRSA SPHEREx mission page (irsa.ipac.caltech.edu/Missions/spherex.html) | Release history (QR2 Oct 2025, PSF header fix Apr 10 2026, QR3 Sep 2026), tools (Source Discovery, MOST, Spectrophotometry, Mosaic) | Nov 2026 |
| S2 | SPHEREx Archive User Guide: Data Products (caltech-ipac.github.io/spherex-archive-documentation, dated Sep 28 2026) | MEF layout, bands, ePSF, calibration products, filename conventions | Nov 2026 |
| S3 | SPHEREx Archive User Guide: Data Access (same site) | SIA2 collections, cutout syntax, S3, ingest lag | Nov 2026 |
| S4 | SPHEREx QR Overview (irsa…/docs/overview_qr.html) | QR1 retirement (Feb 2026), QR3 start | Nov 2026 |
| S5 | SPHEREx Explanatory Supplement (SSDC-DP-017) | Exposure 113.58 s, frame time 1.5349 s, target groups of 17 pointings, slew counters | Nov 2026 |
| S6 | Pipeline paper (arXiv 2511.15823 / ApJS) | 72 MB per image, 190 TB total spectral images, all-sky cubes (95 TB, Year-1 release Nov 2026), astrometric QA (FINAST) | Nov 2026 |
| S7 | Bock et al. 2026, ApJ 999, 139 (SPHEREx Satellite Mission) | 11.8′ small slews, large slews ≤70°, survey cadence, Solar System Object catalog | Nov 2026 |
| S8 | SPHEREx Sky Simulator paper (ApJS, arXiv 2505.24856) | Pre-launch 5σ single-visit point-source depth | Nov 2026 |
| S9 | IRSA tutorials (caltech-ipac.github.io/irsa-tutorials) | SIA/TAP/cutout/ePSF/source-discovery code | Nov 2026 |
| S10 | IRSA Spectrophotometry Tool help | FLAGS bit definitions | Nov 2026 |
| S11 | AWS Open Data registry: spherex-qr | `s3://nasa-irsa-spherex/qr2/...`, anonymous access | Nov 2026 |
| S12 | JPL SSD APIs: Horizons, sb_ident, SBDB | Ephemerides, known objects in FOV, physical data | Nov 2026 |
| S13 | Horizons record −163182 (SPHEREx) | Spacecraft orbit from concatenated TLEs (+30 d prediction) | Nov 2026 |
| S14 | Brown, Holman & Batygin 2024, AJ (Pan-STARRS1 Planet Nine search) | Current Planet Nine parameter posteriors and exclusions | Nov 2026 |
| S15 | Batygin et al. 2019, Physics Reports (arXiv 1902.10103) | Hypothesis review, magnitude ranges | Nov 2026 |
| S16 | Fortney et al. 2016, ApJL 824, L25 | Planet Nine atmosphere, Teff, 3–5 µm emission | Nov 2026 |
| S17 | ACT Planet 9 search (arXiv 2104.10264), citing Meisner et al. 2018 | WISE W1 > 16.7 limit | Nov 2026 |
| S18 | Whidden et al. 2019, AJ 157, 119 (KBMOD); DEEP VI (arXiv 2310.03678) | Shift-and-stack algorithm and GPU performance | Nov 2026 |
| S19 | Holman et al. 2023 (ASSIST, arXiv 2303.16246) | Ephemeris-quality integrator on REBOUND/IAS15, DE441 | Nov 2026 |
| S20 | Aladin Lite v3 documentation (CDS) | WebGL2 engine, FITS HiPS tiles, MOCs, projections | Nov 2026 |
| S21 | astroquery IRSA MOST documentation | `catalog="spherex"` precovery | Nov 2026 |
| S22 | LPSC 2025/2026 SPHEREx Solar System abstracts; Lisse et al. 2026 RNAAS (3I/ATLAS) | SPHEREx solar-system science context | Nov 2026 |

Data citation DOIs used by IRSA: 10.26131/IRSA629 (S11 citation) and 10.26131/IRSA652 (cited by the pipeline paper and team repos for the QR spectral images). Confirm which DOI applies to QR2 versus QR3 on the IRSA page before publishing.

---

## 3. Scientific Dataset Inventory and Acquisition

### 3.1 SPHEREx Level-2 Spectral Images (primary dataset)

**Releases.** QR1 (Jul 2025) was retired in Feb 2026 and is no longer available. QR2 (from Oct 2025) has much better calibration; its headers were corrected on Apr 10, 2026 for a PSF header error. QR3 began in Sep 2026. Ingest is weekly, and data are public within 60 days of acquisition. All-sky spectral cubes (95 TB) are scheduled for a Year-1 release in Nov 2026. Check at kickoff whether they are live.

**File format (one MEF per detector per pointing, about 70 MB):**

| HDU | Content | Shape / units | Use in this project |
|---|---|---|---|
| 1 IMAGE | Calibrated surface brightness, zodi **not** subtracted | 2040×2040, MJy/sr | Display, detection |
| 2 FLAGS | Per-pixel bitmap | 2040×2040 int | Masking (see 3.3) |
| 3 VARIANCE | Per-pixel variance | (MJy/sr)² | S/N, weighting, likelihood images |
| 4 ZODI | Zodiacal model (Kelsall et al. 1998, scaled) | MJy/sr | Subtract before differencing |
| 5 PSF | 121 PSFs (11×11 zones), 101×101, 10× oversampled (0.615″ per PSF pixel) | cube | Injection, PSF photometry (QR2) |
| 6 WCS-WAVE | Lookup table: central wavelength and bandwidth per control point | table | Per-pixel wavelength (about 1 nm accuracy, display grade) |

A size cross-check derived here: four 2040² 32-bit planes come to about 66.6 MB, consistent with the stated ~70 MB.

**Bands (detectors):** D1 0.75–1.09 µm (R=39); D2 1.10–1.62 (R=41); D3 1.63–2.41 (R=41); D4 2.42–3.82 (R=35); D5 3.83–4.41 (R=112); D6 4.42–5.00 (R=128). The wavelength varies along one detector axis (LVF). The six detectors image simultaneously through a dichroic. A given sky point therefore falls at a *different wavelength in every exposure*.

**Key calibration and ancillary products:**
- **ePSF (QR3).** 21×21 zones (D3: 11×41), 33×33 pixels, 5× oversampled. IRSA recommends using them for **all** images, including QR2.
- **Spectral WCS (CWAVE/CBAND).** Science-grade per-pixel wavelength; WCS-WAVE is for visualization only.
- **Flux corrections (QR3).** Per-pixel factors for combining QR2 and QR3 data. This is mandatory if photometry mixes releases.
- **SIP distortion, solid-angle pixel map, nonfunctional pixels, crosstalk (QR3), auroral/He/shuttle-glow templates (QR3).**
- **Pixel scale** is about 6.15″ (often quoted as 6.2″). Astrometry is tied to Gaia. Images reach IRSA only if FINAST = 0 (rms < 1″). The median alignment precision of those images is 0.1–0.4″.

**Observation naming:** `level2_[PlanningPeriod]_[LargeSlew]_[SmallSlew]D[det]_spx_l2b-v[ver]-[YYYY-DDD].fits`. A planning period is about 3.5 days. Each large slew has up to 4 small slews.

### 3.2 Survey geometry that determines what can be detected

- Exposure is about 113.6 s (Explanatory Supplement; the simulator used 112.5 s). Small slews are 11.8′, matching the spacing of spectral channels. A target group has 17 pointings at fixed ecliptic longitude, stepped in latitude. Large slews are up to 70°.
- The orbit is Sun-synchronous polar LEO at about 650 km, 98-min period, about 14.5 orbits per day, with pointing kept at roughly 90° from the Sun. Each 6 months gives a full sky; four all-sky passes are planned in the 2-year prime mission. Deep fields of about 100 deg² each near the ecliptic poles are visited every orbit.
- **Pre-launch 5σ point-source depth per visit:** the Sky Simulator paper (Crill et al. 2025, ApJS) gives "m_AB 18.5–19 from 0.75 to 3.8 µm and m_AB 16.6–18 from 3.8 to 5 µm, with the sensitivity limited by the zodiacal light background at all wavelengths." Combined all-sky survey depth is quoted as about 18.2–19.7 below 3.8 µm. Deep fields reach about 21–21.5.

**Derived consequences.** These follow from geometry; they are not published measurements and must be verified in experiment E1.
1. **Fast movers** (NEOs, main-belt asteroids, comets) shift by many pixels between consecutive visits to a field (hours to days), so classic difference imaging and tracklet linking work.
2. **Distant movers** (TNOs, a Planet Nine) are observed near quadrature. There, Earth's orbital velocity points almost along the line of sight, so parallactic motion is near its minimum, close to the stationary point. Within a single survey pass they barely move relative to a 6″ pixel. Between successive 6-month passes, SPHEREx views them from opposite sides of Earth's orbit, a baseline of about 2 au. The parallax shift is then about 2 au / d radians: roughly 825″ (about 14′, about 130 pixels) at 500 au, and about 2.2° at 52.7 au (Makemake). Distant movers therefore show up as *a source present in pass N and absent in pass N+1, with a new source about 2/d radians away*. They do not appear as a streak within one pass.
3. LEO parallax matters for nearby objects. The roughly 7,000 km offset from the geocentre shifts a main-belt asteroid at 1.5 au by several arcseconds, about one pixel. **Always compute ephemerides for SPHEREx's own position** (Horizons −163182, or the spacecraft position in the FITS header), never for the geocentre.

### 3.3 FLAGS (IRSA definitions)

Bits: 0 TRANSIENT (e.g., cosmic ray); 1 OVERFLOW; 2 SUR_ERROR; 6 NONFUNC; 7 DICHROIC; 9 MISSING_DATA; 10 HOT; 11 COLD; 12 FULLSAMPLE; 14 PHANMISS; 15 NONLINEAR; 17 PERSIST; 19 OUTLIER; 20 CROSSTALK; 21 SOURCE; 22 GHOST; 23 GHOST_FPA; 24 GHOST_EXT; 25 STREAK; 26 BLOOM; 27 SNOWBALL; 28 HALO; 29 SATELLITE_HALO. IRSA's Tractor photometry ignores SUR_ERROR, NONFUNC, MISSING_DATA, HOT, COLD, NONLINEAR, PERSIST, BLOOM, SNOWBALL, HALO and SATELLITE_HALO; this project adopts that mask as its baseline.

**Critical caution:** **do not mask OUTLIER, and do not mask SOURCE blindly.** A real moving object is, by definition, an outlier against the static sky. Use OUTLIER as a *seed* for candidates (one team does exactly this), and use TRANSIENT and STREAK as artifact vetoes. The pipeline paper's descriptions say early data releases under-flagged bad pixels; this was fixed from Dec 2025 but not applied retroactively. Treat early-2025 frames with extra suspicion.

### 3.4 Access interfaces (verified syntax)

| Interface | Endpoint / usage | Notes |
|---|---|---|
| SIA2 | `https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_qr3&POS=circle+RA+DEC+R&RESPONSEFORMAT=...` | Collections: `spherex_qr3`, `spherex_qr3_deep`, `spherex_qr2`, `spherex_qr2_deep`; returns `access_url` and `cloud_access`; **lags ingest by about 1 day** |
| TAP | `https://irsa.ipac.caltech.edu/TAP`, tables `spherex.artifact`, `spherex.plane` (ObsCore-style) | Newest data first; IRSA's cutout tutorial builds cutout URLs in ADQL |
| Cutout service | `<on-prem access_url>?center=RA,DEC&size=DEG` | Returns the same 6 HDUs trimmed; PSF HDU unmodified; CRPIX1A/2A map cutout pixels back to parent-image pixels (watch the 1-based vs 0-based conversion) |
| Browsable directories | `https://irsa.ipac.caltech.edu/ibe/data/spherex/{qr2,qr3}/...` | Calibration files are only here (not in SIA) |
| AWS S3 | `s3://nasa-irsa-spherex/qr2/level2/` (`--no-sign-request`) | Full-file and byte-range reads; good for bulk and CI runners |
| astroquery | `Irsa.query_sia(pos=..., collection=...)`, `Irsa.list_collections(filter='spherex')`, `astroquery.ipac.irsa.most` with `catalog="spherex"` | MOST added SPHEREx on Jul 14, 2026 |
| pyvo | `pyvo.dal.TAPService(...)` | Standard IVOA |
| GUI | SPHEREx Data Explorer | For manual checks |

**Team-reported (unverified) measurements to re-check in experiment E2:** a 0.1° cutout is about 4 MB versus about 65 MB for the full file; HTTP-range reads of only the header and needed rows are about 1–3 MB per frame; the S3 bucket allows cross-origin range requests from browsers; first cutout latency is 5–30 s, with cached responses near-instant.

### 3.5 Complementary datasets

| Dataset | Role | Access | Priority |
|---|---|---|---|
| JPL sb_ident | Known asteroids and comets in an exposure's FOV, using a geocentric observer vector `xobs` (km, ICRF) | ssd-api.jpl.nasa.gov/doc/sb_ident.html | **Must** |
| JPL Horizons | SPHEREx state vector (−163182); target ephemerides from SPHEREx | Horizons API | **Must** |
| JPL SBDB | Orbit class, H, albedo (context only) | SBDB API | Should |
| IRSA MOST | Which SPHEREx frames contain a named object (curated "stories") | astroquery MOST | Should |
| Gaia DR3 | Star positions and proper motions (separate stars from Solar System movers; check astrometry) | TAP | Should |
| WISE/NEOWISE, 2MASS HiPS | Sky context in Aladin Lite; cross-epoch comparison over 15 years | CDS HiPS / IRSA | Could |
| IMCCE SkyBoT | Independent known-object check | Web API | Could |
| Planet Nine posterior (Brown and Batygin synthetic population) | Draw the "where it might be" band on the sky map | Publication supplementary data (verify licence) | Could |

---

## 4. Scientific Foundations

### 4.1 Planet X and Planet Nine: what is established

- **Hypothesis.** The clustering of perihelia and orbital poles among distant eccentric trans-Neptunian objects (TNOs) led Batygin and Brown (2016) to propose a planet of about 10 Earth masses at about 700 au, with eccentricity about 0.6.
- **Current best estimate (Brown, Holman and Batygin 2024, Pan-STARRS1):** semimajor axis 500 (+170/−120) au; mass 6.6 (+2.6/−1.7) Earth masses; aphelion 630 (+290/−170) au; current distance 550 (+250/−180) au. Pan-STARRS1 rules out the predicted planet to V = 21.5 at 50% completeness. The same paper notes that "much of the remaining parameter space is at V>21 in regions near and in the area where the northern galactic plane crosses the ecliptic." The Pan-STARRS1 paper itself (Brown, Holman and Batygin 2024) states that this survey, "along with previous analyses of the Zwicky Transient Facility (ZTF) and Dark Energy Survey (DES) data, rules out 78% of the Brown & Batygin parameter space."
- **Thermal emission (Fortney et al. 2016).** Intrinsic Teff is about 35–50 K for 5–20 Earth masses. The ACT paper's Table 1, drawn from Fortney et al. 2016, gives 36.7–42.2 K for 5 Earth masses and 40.3–48.3 K for 10 Earth masses across three envelope cases; the nominal 5 Earth-mass case has radius 2.94 Earth radii and Teff 42.2 K. Methane condensation can make the planet "blue" in WISE colours. The 3–5 µm flux is far above blackbody but **highly model-dependent**. The ACT team (Naess et al. 2021) writes that "emission predictions in the 3-5 µm window are extremely model dependent, varying by four orders of magnitude."
- **WISE limit (Meisner et al. 2018, as cited by ACT):** W1 (3.4 µm) > 16.7 Vega at 90% confidence, i.e. flux below 65 µJy. Naess et al. 2021 summarise it this way: "For the most optimistic atmospheric models, this excludes a 10 M⊕ Planet 9 up to 900 AU, but for more typical cases WISE would not be sensitive to Planet 9's thermal radiation."
- **The hypothesis remains unconfirmed and contested.** Present it as a hypothesis, never as an object.

**Feasibility verdict for SPHEREx.** A V > 21 reflected-light target is 2–3 magnitudes fainter than SPHEREx's roughly AB 18.5–19 single-visit depth, and SPHEREx's 6″ pixels raise confusion in crowded fields. At 3–5 µm, SPHEREx's single-visit depth (AB about 16.6–18) is shallower than WISE's W1 limit (W1 16.7 Vega ≈ 19.4 AB, using the standard +2.7 mag conversion, which should be verified). Only deep-field coverage near the ecliptic poles reaches about AB 20–21, and Planet Nine predictions favour low-to-moderate ecliptic latitudes. **Conclusion: a SPHEREx Planet Nine detection is not a credible hackathon outcome. The tool should demonstrate the method and quantify the limits.**

### 4.2 Algorithms (relevant and evaluated)

| Problem | Recommended method | Complexity | Why / limits |
|---|---|---|---|
| Find exposures covering (RA, Dec, t) | SIA2/TAP spatial query; MOST for named objects | Server-side | Use TAP for newest data (SIA lags about 1 day) |
| Wavelength-matched comparison | Compare only exposures whose CWAVE at the target pixel matches within a tolerance (e.g., < ½ channel), or normalise by a per-source SED | O(N) | LVF: different-wavelength epochs produce spurious "changes" (one team built a regression test for this) |
| Background | Subtract the ZODI HDU, then a local median or MAD background | O(pixels) | Zodi is the dominant diffuse term |
| Reprojection for blink | Nearest-neighbour or bilinear onto a common tangent-plane grid per field; north-up | O(pixels) | Cutouts from different pointings have different orientations; flux-conserving reprojection is unnecessary for display |
| Change detection (fast movers) | Per-epoch PSF-matched difference against the median of other epochs (same band), threshold on variance-normalised residual, seeded by OUTLIER flags | O(N·pixels) | Self-subtraction for slow movers (a team reports about 14% completeness below about 2″/day) |
| Linking | Tracklets from ≥3 detections with constant-rate fit; reject same-pixel artifacts; scramble test for false-alarm rate | O(n²) per field, small n | Good enough at SPHEREx source densities outside the Galactic plane |
| Faint/slow movers | Shift-and-stack on likelihood images (KBMOD formalism) over a velocity grid | O(images × pixels × trajectories) | KBMOD: >10¹⁰ trajectories in minutes on a consumer GPU; DEEP: 576 s median per CCD stack of about 100 images on an A40. SPHEREx stacks per field are small; CPU numpy/numba is enough for a demo |
| Distant objects across 6-month passes | Predict the parallactic displacement for trial distances d (2 au/d rule plus exact geometry from SPHEREx positions); pair "vanished" and "appeared" sources | O(n·grid) | Physically matched to quadrature viewing; demonstrated on real dwarf planets |
| Known-object identification | sb_ident with `xobs` = SPHEREx geocentric vector at exposure mid-time; match radius a few arcsec plus ephemeris uncertainty | API | Using the geocentre causes pixel-level errors for nearby objects |
| Orbit from a short arc | Statistical ranging (Virtanen et al. 2001) giving a heliocentric distance distribution; report distance, not elements | Moderate | Arcs of hours to days do not constrain unique orbits; one team reports this working with 100 clones |
| Ephemeris-quality propagation | ASSIST (on REBOUND IAS15, DE441, 16 asteroid perturbers, GR, J2) | Fast | Needed only for validation or precovery of candidate orbits; Horizons covers known objects. Matches JPL's small-body integrator; requires DE441 files (the extended file is 2.6 GB) |
| Detection-limit quantification | Inject ePSF-convolved synthetic movers into real frames over a magnitude × rate grid; recover blind | O(grid × pipeline) | The single most persuasive scientific artefact for judges |
| Spectrum of a mover | Forced PSF photometry at predicted positions across all exposures, using CWAVE; divide by a solar spectrum for reflectance | O(N) | SPHEREx's unique selling point; optional |

**Do you need a physics engine?** No for the core product. JPL services already provide ephemeris-quality positions for all known objects. ASSIST/REBOUND is justified only for (a) propagating ranging clones of a new candidate, or (b) an educational "where would Planet Nine be" animation. Even there, two-body Keplerian propagation is sufficient at 500 au over a few years.

### 4.3 Validation methods

1. **Known-asteroid recovery:** the fraction of sb_ident-predicted objects above a magnitude cut that are recovered, plus their astrometric residuals.
2. **Injection-recovery:** 50% completeness magnitude versus rate, false-positive rate per deg² from scrambled-time tests. Report confidence intervals.
3. **Distant-object proxy:** recover Makemake (about 52.7 au), Haumea and Eris across 6-month passes. Compare measured displacement with Horizons predictions from SPHEREx.
4. **Astrometric sanity:** residuals of Gaia stars in cutouts (expect 0.1–0.4″ for FINAST = 0 images).
5. **Reproducibility:** every published number is stamped with the pipeline commit, data release, file list and run ID.

---

## 5. Technology Evaluation

| Layer | Options considered | Decision | Rationale |
|---|---|---|---|
| Pipeline language | Python; Rust; C++; Julia | **Python 3.11+** | The entire IRSA/astropy ecosystem, official tutorials and FITS/WCS (including SIP and the LVF lookup table) are Python-first. Workloads are I/O-bound, not CPU-bound |
| FITS/WCS | astropy.io.fits, astropy.wcs; fitsio | **astropy** | Official tutorials; handles `CRPIX1A` alternate WCS; supports lazy/remote reads |
| Archive access | astroquery, pyvo, raw HTTP | **astroquery (SIA, MOST) + pyvo (TAP) + httpx** | All officially documented by IRSA |
| Detection/photometry | photutils, SEP, custom | **photutils** (plus numpy for likelihood images) | Maintained Astropy-affiliated library; enough at these source densities |
| Acceleration | numba, JAX, CuPy, KBMOD (CUDA) | **None for MVP; numba for an optional shift-and-stack** | Per-field data are tens of MB; a GPU adds deployment risk for no user-visible gain. KBMOD is the reference if a GPU search becomes a stretch goal |
| Orbits/ephemerides | JPL APIs; ASSIST+REBOUND; poliastro/two-body | **JPL APIs; two-body for ranging; ASSIST only if needed** | Do not re-implement what JPL serves authoritatively |
| Parallel/batch | Dask, Ray, multiprocessing, GitHub Actions matrix | **asyncio for HTTP + multiprocessing; CI matrix for survey shards** | The bottleneck is network latency; Dask is overkill. One team runs 15 parallel shards on GitHub runners reading S3 directly |
| Storage | FITS cache; Parquet; HDF5; Zarr; SQLite/Postgres | **FITS on-disk cache (raw) + Parquet (detections) + JSON/WebP (web)** | Zarr/HDF5 add nothing at this scale; a database is not required for a static site |
| Sky context viewer | Aladin Lite v3; custom WebGL; Stellarium-web | **Aladin Lite v3** | WebGL2, all-sky projections, MOC footprints, HiPS overlays (2MASS/WISE), catalogue overlays; used by ESASky and ESO portals; GPLv3 licence (check compatibility) |
| Blink viewer | Canvas2D; WebGL; client-side FITS decode | **Canvas/WebGL on server-stretched 8-bit WebP/PNG, with optional client FITS for power users** | Predictable performance on phones; stretch done once with astropy's asinh/zscale |
| Charts | Plotly; Vega-Lite; D3 | **Plotly** (spectra, completeness curves) | Interactive, low effort |
| Web framework | Next.js; Vite+React; plain HTML | **Vite + React (static export)** or plain HTML | No server rendering needed |
| Live API | FastAPI server; serverless (Cloudflare Workers / Vercel); none | **Thin serverless proxy** | Hides JPL CORS/rate-limit issues, caches 24 h; heavy pixel work stays offline |

**Real bottlenecks, ranked:**
1. Network I/O and archive latency: cutout generation plus about 70 MB full files.
2. Archive rate limits and courtesy: no published limit was found, so assume one is needed.
3. Correctness traps: LVF wavelength mismatch, LEO parallax, flag semantics, 0- and 1-based pixel conventions, QR2/QR3 flux scale.
4. CPU is not a bottleneck.

---

## 6. Benchmarks: Published Versus Proposed

**Published or verified numbers (cite as such):** MEF about 70 MB (IRSA), or 72 MB (pipeline paper); total spectral images 190 TB; KBMOD >10¹⁰ trajectories in minutes on a consumer GPU; DEEP 576 s per CCD stack on an A40; astrometric precision 0.1–0.4″; exposure 113.58 s.

**Team-reported, unverified:** cutout about 4 MB per 0.1°; range reads 1–3 MB per frame; first cutout 5–30 s; one team's CNN real/bogus AUC of 0.973 on *synthetic* skies (not real data); 9/9 cross-tile links confirmed by JPL in one repository.

**Proposed reproducible experiments (run in hour 0–6 of the hackathon):**

| ID | Question | Method | Acceptance / decision |
|---|---|---|---|
| E1 | Revisit cadence per field (hours, days, months), per detector and wavelength | TAP query of all exposures within 0.05° of 5 test points (ecliptic, mid-latitude, NEP deep field, Galactic plane, Makemake's track); histogram Δt and ΔCWAVE | Sets the detector design: if fewer than 3 same-band epochs within 48 h, the fast-mover mode must use cross-band normalised comparison |
| E2 | Cutout vs range-read vs full-file cost | 50 random frames × 3 methods; record bytes, p50/p95 latency, failure rate | Choose the default fetch path; target p95 < 10 s for a first frame |
| E3 | S3 cross-origin range from the browser | `fetch` with a Range header from a static page | If it works, the browser-direct path becomes the fallback |
| E4 | Known-asteroid recovery | 10 ecliptic fields; sb_ident with SPHEREx `xobs` vs geocentre | Expect geocentre errors of several arcsec for main-belt asteroids; keep `xobs` |
| E5 | Injection-recovery | ePSF-injected movers, magnitudes 15–20 AB, rates 0.1–150″/h | Publish the 50% completeness curve |
| E6 | Distant-object demo | Makemake, Haumea and Eris across 2 passes | Measured vs predicted displacement < 1 pixel |
| E7 | Static build throughput | Wall time per showcase field on a 4-core runner | < 5 min per field |

---

## 7. Architecture Alternatives and Decision

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A. Static-first + offline pipeline + thin serverless | Python precomputes curated fields, candidates and limits to JSON/WebP; static site; serverless for live JPL/IRSA lookups | Fast, robust demo; no backend to fall over during judging; cheap; reproducible | Arbitrary new fields need a live path | **Selected core** |
| B. Live Python backend (FastAPI) doing cutouts and detection on demand | Server fetches cutouts, runs detection per request | Any sky position | 5–30 s cold latency; hosting fragility; IRSA load | Use only as an *optional* "analyse this patch" job |
| C. Browser-direct (S3 range reads + JS FITS parsing) | No server for pixels | Zero backend; scales | Depends on CORS and JS FITS/WCS correctness (SIP, LVF) | **Fallback viewer path**, if E3 passes |
| D. Full-sky HPC shift-and-stack Planet Nine search | GPU KBMOD over all passes | Impressive-sounding | Days of compute; physically mismatched (quadrature, depth); high false-positive risk | **Rejected** |

**Selected: A + C, with B as an optional queue.**

```
IRSA TAP/SIA2 ─┐                     ┌─> data/fields/*.json, frames/*.webp, limits.json, candidates.parquet
S3 / cutouts ──┼─> pipeline (Python) ─┤
JPL sb_ident ──┤    ingest→calibrate→ └─> provenance manifest (file, obsid, t_mid, det, CWAVE, release, commit)
Horizons ──────┘    detect→link→vet→inject
                                   │
                         static web app (Vite/React + Aladin Lite + Plotly)
                                   │
                    serverless proxy: /api/known?obsid=…  /api/cutout?…  (24 h cache)
```

---

## 8. Recommended Strategies

- **Data processing:** query metadata first (TAP), fetch pixels second. Never download full-sky data. Use cutouts of 0.1–0.3° for blink, full files or range reads only for survey shards on CI or cloud near the S3 region. Subtract ZODI. Mask with the Tractor flag set. Use OUTLIER and TRANSIENT as seed and veto respectively. Match wavelengths. Use ePSFs for injection and photometry.
- **Storage:** content-addressed FITS cache keyed by observation ID, detector and release version. Parquet tables for detections, tracklets and injections. A small JSON "field manifest" per showcase field. Version every derived product with the pipeline commit.
- **Computation:** asyncio HTTP with concurrency ≤ 4–8 per host, exponential backoff, and a User-Agent with contact details. Run numpy per field and parallelise across fields.
- **Visualization:** Aladin Lite for "where on the sky" (footprints, Planet Nine probability band, ecliptic, known objects). A dedicated blink canvas with blink, swipe, difference and time-coloured RGB modes. A per-candidate evidence card with stamps, motion vector, JPL match, S/N and wavelength per epoch. A "Limits" page with the completeness curve and the Planet Nine magnitude comparison.

---

## 9. Risks, Limitations, Assumptions, Open Questions

| Risk / unknown | Impact | Mitigation |
|---|---|---|
| Official statement, resources and judging criteria unread | Could misalign scope | Read the page manually at kickoff; update section 1.2 |
| IRSA latency or outage during judging | Demo failure | Ship precomputed showcase data; live features degrade gracefully |
| Rate limits not documented | Throttling or bans | Caching, low concurrency, prefer S3 for bulk |
| LVF wavelength mismatch | False "changes" | Same-band rule plus regression test |
| LEO vantage ignored | Pixel-level ephemeris errors | `xobs` from Horizons −163182 or header (TLE-based; check accuracy) |
| QR2/QR3 mixing | Flux jumps | Apply QR3 flux corrections or use one release per comparison |
| Early-2025 under-flagging | Artifacts as candidates | Extra vetting; scramble tests |
| Over-claiming Planet X | Credibility loss | Language rules in AGENTS.md; limits page |
| Galactic plane crowding (6″ pixels) | Very high false positives | Exclude or flag low Galactic latitude in automatic search |
| MPC reporting | SPHEREx observatory code not confirmed | Export ADES drafts only; no auto-submission |
| Space Apps build-timing rules | Disqualification risk | No production code before Nov 14 kickoff |

**Assumptions:** QR3 SIA collections remain live through judging. The JPL APIs remain publicly accessible. Browser S3 CORS behaviour is as reported by teams (verified in E3).

---

## 10. Prioritised Roadmap (48-hour hackathon)

| Phase | Hours | Deliverable | Depends on | Acceptance criteria |
|---|---|---|---|---|
| P0 | 0–2 | Read the official statement; freeze scope; run E1–E3 | – | Requirements table updated; fetch path chosen |
| P1 | 2–10 | `spherex_access` module: TAP/SIA search, cutout fetch, cache, provenance | P0 | 20 frames for 3 fields fetched; manifest validates |
| P2 | 6–16 | Blink viewer MVP (static JSON + WebP) with provenance panel | P1 | Non-expert can blink Pluto/Neptune/asteroid field on a phone |
| P3 | 10–22 | Known-object overlay via sb_ident with SPHEREx `xobs` | P1 | ≥90% of predicted objects with V < 17 land within 2 pixels |
| P4 | 14–28 | Fast-mover detection, linking, vetting, evidence cards | P1, P3 | Scramble false-alarm rate reported; ≥1 known asteroid recovered blind |
| P5 | 20–32 | Injection-recovery and Limits page | P4 | Completeness curve with confidence intervals published |
| P6 | 24–36 | Planet X mode: Makemake/Haumea across passes, Planet Nine comparison graphic | P1, E6 | Measured displacement within 1 pixel of prediction |
| P7 | 30–40 | Aladin Lite context map, stories, spectra (optional) | P2 | Loads in < 3 s on 4G |
| P8 | 40–48 | Hardening, offline fallback, video, README, citations | All | Demo works with IRSA unreachable |

---

## 11. IMPLEMENTATION_CONTEXT.md (content)

**Goal.** Public web tool ("SPHEREx Sky Changes") that lets anyone blink real SPHEREx images of any sky patch, see what moved, check it against JPL, and understand SPHEREx's reach for a Planet X.

**Repository layout.**
```
pipeline/spherex_px/   access.py  calib.py  detect.py  link.py  vet.py  inject.py  ephem.py  distant.py  export.py
pipeline/tests/        test_wavelength_match.py  test_pixel_conventions.py  test_xobs.py  test_flags.py
web/                   src/viewer  src/sky (Aladin Lite)  src/limits  public/data/
api/                   known.ts (sb_ident proxy)  cutout.ts (IRSA proxy)  health.ts
docs/                  CHALLENGE.md  DATA.md  SCIENCE.md  DECISIONS.md  EXPERIMENTS.md
```

**Constants and conventions.**
- Releases: `spherex_qr3` (default), `spherex_qr2` (comparison); `*_deep` for NEP/SEP.
- Pixel about 6.15″; image 2040×2040; exposure about 113.6 s; small slew 11.8′.
- FITS is 1-based. Astropy is 0-based. Cutout→parent: `x_orig = 1 + x_cut - CRPIX1A`. PSF zone keyword `i` (1..121) maps to cube plane `i-1`.
- Wavelength: use CWAVE/CBAND from the Spectral WCS product for science; WCS-WAVE for display only.
- Mask bits (exclude): SUR_ERROR(2), NONFUNC(6), MISSING_DATA(9), HOT(10), COLD(11), NONLINEAR(15), PERSIST(17), BLOOM(26), SNOWBALL(27), HALO(28), SATELLITE_HALO(29); also DICHROIC(7) for D3/D4.
- Vetoes (artifact evidence): TRANSIENT(0), STREAK(25), GHOST(22/24), CROSSTALK(20).
- Seeds: OUTLIER(19).
- Ephemerides: observer = SPHEREx (Horizons −163182) at exposure mid-time; sb_ident `xobs` in km, ICRF, geocentric.

**Data contracts.**
- `frame`: {obs_id, detector, release, file_url, t_mid_utc, ra_c, dec_c, cwave_um_at_target, cband_um, finast, n_transient, sha256}
- `detection`: {frame_id, x, y, ra, dec, flux, flux_err, snr, flags_or, cwave_um}
- `tracklet`: {id, detections[], rate_arcsec_h, pa_deg, chi2, jpl_match{name, sep_arcsec} | null, ranging{d_au_p5, p50, p95}}
- `injection`: {mag_ab, rate, recovered, snr}

**Pipeline steps (per field).** TAP search → wavelength-group frames → fetch cutouts (cache) → subtract ZODI → mask → reproject to a field grid → median-of-others difference per band group → detect (≥5σ, variance-normalised) → link (≥3 epochs, constant rate) → vet (same-pixel, scramble, flags) → sb_ident match → ranging → render WebP stamps → write JSON and Parquet with provenance.

**Validation gates (CI).** Unit tests for conventions; a golden field with a known asteroid; an injection run producing a completeness curve; pipeline refuses to publish from a dirty git tree.

**Do not build.** Full-sky GPU searches; a custom n-body engine; a database server; user accounts; automatic MPC submission.

---

## 12. AGENTS.md (content)

1. **Scope:** this is a public sky-change viewer with an honest mover finder. Planet X is motivation only. Never output text claiming detection or discovery of Planet X or Planet Nine. Use "candidate", "unexplained mover" or "requires follow-up".
2. **Data:** real SPHEREx data only, from IRSA (TAP/SIA2/cutouts) or `s3://nasa-irsa-spherex`. Any synthetic data must be labelled "SIMULATED" in the UI and in the data.
3. **Provenance:** every image and number carries obs_id, detector, release, t_mid, CWAVE and pipeline commit. Cite the SPHEREx DOI and acknowledge NASA/JPL-Caltech/IPAC.
4. **Physics invariants:** compare same-wavelength epochs only. Use SPHEREx's position, not the geocentre, for ephemerides. Subtract ZODI before differencing. Respect the FLAGS semantics in IMPLEMENTATION_CONTEXT. Never mask OUTLIER.
5. **Conventions:** FITS 1-based, Python 0-based; write a test for every conversion.
6. **Performance:** metadata first, pixels second. Cutouts ≤0.3° for the web. Cache everything. Concurrency ≤8 per host with backoff. No GPU dependency in the core path.
7. **Dependencies:** Python (astropy, astroquery, pyvo, photutils, numpy, scipy, httpx, pyarrow); web (Vite/React, Aladin Lite v3, Plotly). Adding anything else requires a line in docs/DECISIONS.md.
8. **Validation before claims:** any metric shown in the UI must come from a reproducible script in `pipeline/` with its run ID.
9. **Resilience:** the demo must work with IRSA and JPL unreachable, using precomputed data.
10. **Rules:** follow Space Apps rules on timing and AI-use disclosure; log AI assistance in AI_USAGE.md.

---

## 13. Caveats

- The challenge statement, official resource list and judging criteria were not readable verbatim. Section 1 is reconstructed from a team repository's quote, Space Apps social posts and a NASA press release, and it must be re-validated at kickoff.
- Several engineering numbers (cutout sizes, latencies, browser CORS, detection metrics) come from 2026 hackathon team repositories, not from IRSA. They are labelled as unverified and paired with experiments.
- Sensitivity figures are pre-launch predictions. In-flight depth may differ, which is one reason the injection-recovery measurement (E5) is part of the deliverable.
- The quadrature and parallax reasoning for distant objects is a first-principles derivation, not a published SPHEREx result. Experiment E6 validates it on real dwarf planets.
- No code was executed and no data were downloaded during this research phase. All "verified" labels refer to official documentation, not to local benchmarks.