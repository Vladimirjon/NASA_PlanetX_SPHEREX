/**
 * Pixels hidden on purpose (NaN in a frame): saturated, flagged as unreliable by the pipeline,
 * or outside the usable area (detector edge, wavelength drift). They are never filled in or
 * interpolated: the viewer marks them so they cannot be mistaken for dark, empty sky.
 */

import { stretchFrame, type StretchLimits } from './stretch';

export type HiddenViewMode = 'loop' | 'difference' | 'colour';

/** quiet: what everyone sees (saturated centres white, other hidden pixels dark). expert: every hidden pixel hatched. */
export type HiddenStyle = 'quiet' | 'expert';

/**
 * A hidden blob counts as a saturated star centre when the median display brightness (0..1) of the
 * visible pixels touching it is at least this value. Measured on the five demo regions (238 blobs):
 * the saturated centres of R Dra, Barnard and RW Aur have rims of 0.76–1.00; every other blob is 0.67
 * or lower (docs/reviews/hidden-pixels/README.md). Display only: it never feeds a measurement.
 */
export const BRIGHT_RIM_THRESHOLD = 0.7;

/** Quiet fill for hidden pixels that are not a saturated centre: a hair above the black sky floor. */
export const QUIET_FILL_RGB: readonly [number, number, number] = [18, 20, 25];
/** In the difference view mid-grey means "no change", so hidden pixels get a darker neutral grey instead. */
export const QUIET_DIFF_FILL_RGB: readonly [number, number, number] = [66, 70, 78];

export function quietFillFor(mode: HiddenViewMode): readonly [number, number, number] {
  return mode === 'difference' ? QUIET_DIFF_FILL_RGB : QUIET_FILL_RGB;
}

export const NO_DATA_LEGEND = 'Dark grey: no data in one of the two photos, so it is not a change.';
export const SATURATED_FILL_RGB: readonly [number, number, number] = [255, 255, 255];

export const SATURATED_CORE_LEGEND =
  'White centre: too bright for the detector (saturated), so it is not measured.';

/** Static note for the older viewer, which has no expert toggle. */
export const QUIET_LEGEND =
  'White centre: too bright for the detector (saturated). Dark patches: other pixels hidden on purpose (flagged as unreliable or outside the usable area). Neither is measured.';

/** Flat fill for hidden pixels: a dark slate, clearly lighter than the black sky floor. */
export const HIDDEN_FILL_RGB: readonly [number, number, number] = [58, 64, 76];

export const HIDDEN_LEGEND =
  'Hatched: pixels hidden on purpose. They are too bright for the detector (saturated), flagged as unreliable, or outside the usable area, so they are not measured.';

/** 1 where the current view shows no measured value, 0 elsewhere (FITS row order). */
export function hiddenMask(mode: HiddenViewMode, frames: readonly Float32Array[], frameIndex: number): Uint8Array {
  if (frames.length === 0) return new Uint8Array(0);
  const last = frames.length - 1;
  const shown = frames[Math.min(Math.max(frameIndex, 0), last)];
  const pair: readonly Float32Array[] =
    mode === 'loop' ? [shown] : mode === 'difference' ? [frames[0], shown] : [frames[0], frames[last]];
  const mask = new Uint8Array(shown.length);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = pair.some(f => !Number.isFinite(f[i])) ? 1 : 0;
  }
  return mask;
}

export function countHidden(mask: Uint8Array): number {
  let n = 0;
  for (const v of mask) n += v;
  return n;
}

/** Same row flip as the renderer: FITS row 0 is south, the screen draws north up. */
export function flipMaskRows(mask: Uint8Array, height: number, width: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let row = 0; row < height; row += 1) {
    out.set(mask.subarray(row * width, (row + 1) * width), (height - 1 - row) * width);
  }
  return out;
}

export type GridEdge = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/** Outline of the hidden regions in grid units: every cell side that borders a visible cell or the edge. */
export function hiddenEdges(mask: Uint8Array, width: number, height: number): GridEdge[] {
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  const edges: GridEdge[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) edges.push({ x0: x, y0: y, x1: x + 1, y1: y });
      if (!at(x, y + 1)) edges.push({ x0: x, y0: y + 1, x1: x + 1, y1: y + 1 });
      if (!at(x - 1, y)) edges.push({ x0: x, y0: y, x1: x, y1: y + 1 });
      if (!at(x + 1, y)) edges.push({ x0: x + 1, y0: y, x1: x + 1, y1: y + 1 });
    }
  }
  return edges;
}

/** 4-connected blobs of hidden cells, as lists of flat indices. */
function hiddenBlobs(mask: Uint8Array, width: number, height: number): number[][] {
  const seen = new Uint8Array(mask.length);
  const blobs: number[][] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || seen[start] === 1) continue;
    const blob: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      blob.push(i);
      const x = i % width;
      const y = (i - x) / width;
      const next = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const j of next) {
        if (j >= 0 && mask[j] === 1 && seen[j] === 0) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    blobs.push(blob);
  }
  return blobs;
}

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 === 1 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * 1 for hidden cells that belong to a saturated star centre: a hidden blob whose visible
 * 8-neighbour rim is bright (median >= BRIGHT_RIM_THRESHOLD). `norm` is a display-stretched frame.
 */
export function brightCoreMask(
  norm: Float32Array,
  width: number,
  height: number,
  threshold: number = BRIGHT_RIM_THRESHOLD,
): Uint8Array {
  const hidden = new Uint8Array(norm.length);
  for (let i = 0; i < norm.length; i += 1) hidden[i] = Number.isFinite(norm[i]) ? 0 : 1;
  const out = new Uint8Array(norm.length);
  for (const blob of hiddenBlobs(hidden, width, height)) {
    const rim = new Set<number>();
    for (const i of blob) {
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (hidden[j] === 0) rim.add(j);
        }
      }
    }
    if (rim.size === 0) continue;
    if (median([...rim].map(j => norm[j])) >= threshold) {
      for (const i of blob) out[i] = 1;
    }
  }
  return out;
}

export type HiddenLayers = { readonly hidden: Uint8Array; readonly bright: Uint8Array };

/** Which pixels of the current view are hidden, and which of those are saturated star centres (FITS row order). */
export function hiddenLayers(
  mode: HiddenViewMode,
  frames: readonly Float32Array[],
  frameIndex: number,
  limits: StretchLimits,
  width: number,
  height: number,
): HiddenLayers {
  const hidden = hiddenMask(mode, frames, frameIndex);
  if (frames.length === 0) return { hidden, bright: hidden };
  const last = frames.length - 1;
  const shown = frames[Math.min(Math.max(frameIndex, 0), last)];
  const sources = mode === 'loop' ? [shown] : mode === 'difference' ? [frames[0], shown] : [frames[0], frames[last]];
  const bright = new Uint8Array(hidden.length);
  for (const frame of sources) {
    const core = brightCoreMask(stretchFrame(frame, limits), width, height);
    for (let i = 0; i < core.length; i += 1) if (core[i] === 1 && hidden[i] === 1) bright[i] = 1;
  }
  return { hidden, bright };
}
