---
name: "[Name TBD]"
description: Public SPHEREx blink viewer — see what moves in the infrared sky.
colors:
  night: "#07080B"
  panel: "#0E0F13"
  panel-translucent: "rgba(14,15,19,0.88)"
  surface-raised: "rgba(236,234,228,0.04)"
  ink-primary: "#ECEAE4"
  ink-secondary: "#A7A9B0"
  ink-tertiary: "#8A8B90"
  rule-subtle: "rgba(236,234,228,0.10)"
  rule-control: "#6E6F74"
  band-d1: "#B8336A"
  band-d2: "#D9483B"
  band-d3: "#EE6A24"
  band-d4: "#F7931A"
  band-d5: "#F9B934"
  band-d6: "#F6D86B"
  track-cyan: "#5CE1E6"
  error-red: "#FF5D5D"
  focus: "#F9B934"
typography:
  display:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Barlow', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  data:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.band-d6}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.error-red}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  segmented-option:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  segmented-option-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
  detector-chip-active:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.band-d6}"
    rounded: "{rounded.md}"
    size: "40px"
  search-field:
    backgroundColor: "{colors.panel-translucent}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    height: "48px"
  side-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-primary}"
    width: "352px"
---

# Design System: [Name TBD]

## Overview

**Creative North Star: "Infrared Night"**

The app feels like stepping outside at night with an infrared camera: the sky fills the screen and the interface gets out of its way. When you start investigating, it turns into a precise workstation. The darkness is cinematic, as in Stellarium and SpaceX. The density belongs to a scientist's instrument: tables of epochs, measured values in monospace, every frame labeled with its date, wavelength and detector.

Color lives in a single device: **the wavelength ribbon**. SPHEREx sees from 0.75 to 5.0 µm with six detectors. Each detector has its own color, ordered on a thermal ramp from magenta-red (short wavelengths) to pale yellow (long ones). That ramp is the accent system of the whole interface: the active detector, the segment downloading, the series in the spectral profile and the selected state all speak with the color of the band in use. The color of the interface means something physical.

The interface never decorates the sky. No ornamental stars outside the image areas, no neon, no glassmorphism for its own sake, no futuristic typefaces. Every synthetic image is labeled "Illustrative render".

**Key Characteristics:**

- A dark ground that lets the data shine; translucent panels only over the moving sky.
- The thermal D1–D6 ramp as the only accent; cyan reserved for predicted positions; red only for errors.
- Condensed type for structure, humanist type for reading, monospace only for measurements.
- Dense but ranked: the image leads, the controls follow, the metadata supports.
- Every state visible: progress per frame, honest ETA, explained disabled controls.

## Colors

An almost neutral night with a thermal ramp that encodes wavelength, plus two semantic colors that nothing else may use.

### Primary: the wavelength ribbon (D1–D6)

- **Short Magenta** (#B8336A) — D1, 0.75–1.09 µm.
- **Brick Red** (#D9483B) — D2, 1.10–1.62 µm.
- **Ember Orange** (#EE6A24) — D3, 1.63–2.41 µm.
- **Kiln Amber** (#F7931A) — D4, 2.42–3.82 µm.
- **Warm Gold** (#F9B934) — D5, 3.83–4.41 µm. Also the focus-ring color.
- **Pale Flame** (#F6D86B) — D6, 4.42–5.00 µm. Primary button fill when D6 is active.

The active detector's color becomes the interface accent: the selected chip, the progress segment downloading, the slider fill and the main button. When the detector changes, the accent changes.

### Semantic (reserved)

- **Track Cyan** (#5CE1E6) — predicted positions, numbered epochs on the image and the matching epoch numbers in the table. Nothing else.
- **Error Red** (#FF5D5D) — failures (timeout, server down, failed frame). Never decorative, never for "moving" or "variable".

### Neutral

- **Night** (#07080B) — page ground and image canvas.
- **Panel** (#0E0F13) — side panel, toolbars, cards. **Panel Translucent** (88 %) only over the moving sky.
- **Ink Primary** (#ECEAE4) — headings and main text (15.9:1 on panel).
- **Ink Secondary** (#A7A9B0) — supporting text and metadata labels (8.2:1).
- **Ink Tertiary** (#8A8B90) — hints and non-essential notes (5.6:1). Never below this value: the mockup's 40 % gray (3.4:1) failed AA.
- **Rule Subtle** (rgba 236,234,228 / 10 %) — dividers between regions.
- **Rule Control** (#6E6F74) — outline of buttons, inputs and chips (3.8:1, meets WCAG 1.4.11).

### Named Rules

**The Physical Color Rule.** A D1–D6 color appears only when it refers to that band or is the accent of the active band. No band color is ever used "because it looks nice".

**The Reserved Cyan Rule.** Cyan means "where the object should be". If an element is not a predicted position or a numbered epoch, it is not cyan.

**The D1/D2 Text Rule.** Short Magenta (3.4:1) and Brick Red (4.5:1) are fills, strokes and series, never small text. Text over a band fill uses Night (#07080B), which passes on D3–D6; on D1 use Ink Primary (4.7:1).

## Typography

**Display/Labels:** Barlow Semi Condensed (fallback Arial Narrow)
**Body:** Barlow (fallback system-ui)
**Data:** JetBrains Mono with tabular figures

**Character:** a DIN-like condensed grotesque gives the structure of an instrument without falling into "space" typefaces; Barlow reads well in long text; monospace is reserved for what is measured.

### Hierarchy

- **Display** (700, 32px, 1.1): screen titles and the main error heading ("Couldn't reach the data server").
- **Headline** (700, 22px, 1.2): object name in Investigate, mission names.
- **Title** (600, 17px, 1.3): sky card names, panel section titles.
- **Body** (400, 15px, 1.5): explanations, captions, "What am I seeing?". Measure 65–75ch.
- **Label** (600, 12px, +0.06em, uppercase): only short labels (EPOCHS, DETECTOR, STRETCH). Never sentences.
- **Data** (400, 13px, tabular figures): RA/Dec, dates, λ, flags, observation IDs, ETA.

### Named Rules

**The Projector Floor Rule.** No text below **12px**. The mockup used 9–10px in several places; on the coliseum projector it would not be read. Axis numbers on charts: 11px minimum.

**The Measured Monospace Rule.** Monospace is used only for values that were measured or identify data. Using it to "look technical" is not allowed.

**The Unit Case Rule.** Units (µm, ″, ′) never go through `text-transform: uppercase`: µ turns into "M". Wrap the unit with `text-transform: none`.

## Layout

- **Sky (/):** Aladin Lite fills 100 % of the viewport. The top navigation is translucent. The search field sits centered in the upper 40 %, and the five object cards run along the bottom edge. A "layers" bar with the D1–D6 ribbon and the cursor readout (RA/Dec, FOV) closes the screen, Stellarium-style.
- **Investigate:** split of a flexible image stage (~65 % of the width) and a fixed **352px** side panel. Under the image: transport bar (Play/Prev/Next, slider, speed), modes (Blink/Diff/Neg/D1–6), stretch and colormap, then segmented progress. The frame identity (date · λ · detector · collection) sits in the bottom-left corner of the image; scale and FOV in the bottom-right.
- **Side panel**, top to bottom: Epochs table → Detector (D1–D6 chips + ribbon) → Frame metadata → Spectral profile (collapsible) → "What am I seeing?" (collapsible).
- **Spacing:** 4px base scale (4 · 8 · 12 · 16 · 24 · 32). 16px inside panels, 24px between regions.
- **Responsive:** below 1024px the side panel becomes a bottom sheet; below 768px the transport bar keeps only Play, slider and mode, and the sky cards scroll horizontally. Touch targets of 44px minimum.

## Elevation & Depth

Depth through tonal layering, not shadows: Night → Panel → Surface Raised (+4 % ink). Panels over the sky use 88 % translucency with `backdrop-filter: blur(12px)` for **legibility**, never as ornament; over solid ground they are opaque.

**The Light Belongs to Data Rule.** Glow (luminous halo) is only allowed on the image's data points (the star at its epoch, the active segment downloading). Buttons, cards and panels do not glow.

## Shapes

- `4px` chips and segmented controls · `6px` buttons and inputs · `10px` search field, cards and image stage.
- Outlines with Rule Control (1px). The active state raises its background to Surface Raised and changes its text or border to the band color.
- Line icons drawn in SVG, **1.5px** stroke, round caps, one family (e.g. Lucide). No emoji or Unicode characters as icons.
- Numbered epoch circles: 1.5px cyan stroke, no fill, number above and date below; spacing proportional to time.

## Components

- **Search / command palette:** one field that accepts decimal and sexagesimal RA/Dec and names (Postel). `Ctrl/⌘ K` hint visible. Live validation under the field with an example of the expected format.
- **Sky card:** illustrative thumbnail, name (Title), one-line plain description, chips "Moving"/"Variable"/"Offline" with an SVG icon. WISE 0855 carries the only "60-second challenge" badge (Von Restorff); it is the only use of solid Warm Gold on the card.
- **Transport bar:** standard video controls (Jakob). Play is the largest control (48px). Speed 0.5 · 1 · 2 · 3 fps — **never more than 3 fps** (WCAG 2.3.1).
- **Modes:** segmented control Blink / Diff / Neg / D1–6 with their shortcut (B, D, N, C) visible. Disabled with an explanation when there are not enough frames ("Blink needs ≥ 2 frames at the same λ").
- **Segmented progress:** one segment per frame; done in the band color, downloading with pulse, pending in Rule Subtle, failed in Error Red with individual retry. Text with honest ETA in Data.
- **Epochs table:** # (cyan), date, λ (µm), status. The current row raises its background.
- **Detector chips D1–D6:** 40px, number shortcut in the corner, ribbon below with the scale 0.75–5.0 µm and a marker at the λ in use.
- **Spectral profile:** Observable Plot; points colored per detector + distinct marker shapes + direct labels (does not depend on color). Labeled "Illustrative" until it uses real fluxes.
- **Error / offline states:** red outline icon, headline that names the problem, primary action "Load precomputed data", secondary "Retry connection", link to Gallery. A persistent offline banner with "Switch to Gallery".
- **Focus:** 2px Warm Gold outline with 2px offset on every control. Themed text selection (background Warm Gold at 30 %) and themed scrollbars.

## Do's and Don'ts

**Do**

- Label every synthetic image "Illustrative render" and every unvalidated scientific claim as such.
- Show date, λ and detector on every frame.
- Explain every disabled control.
- Keep the D1–D6 color tied to its band.
- Respect `prefers-reduced-motion`: no autoplay blink; side-by-side and difference views instead.

**Don't**

- Decorative stars, nebulae or particles outside the image areas.
- A generic blue accent, neon, gradient text, glass as ornament, offset shadows, colored left borders on cards.
- An eyebrow label above headings; text below 12px; Orbitron, Space Grotesk or Inter.
- Claiming discoveries: the app shows the expected motion of known objects.
- Using NASA logos or imitating NASA's visual identity: credits go as text (SPHEREx, IRSA, DOI).
