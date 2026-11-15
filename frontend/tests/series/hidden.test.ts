import { describe, expect, it } from 'vitest';
import {
  BRIGHT_RIM_THRESHOLD,
  HIDDEN_FILL_RGB,
  HIDDEN_LEGEND,
  NO_DATA_LEGEND,
  SATURATED_CORE_LEGEND,
  quietFillFor,
  brightCoreMask,
  countHidden,
  flipMaskRows,
  hiddenEdges,
  hiddenLayers,
  hiddenMask,
} from '../../src/series/core/hidden';

const N = Number.NaN;

describe('hiddenMask', () => {
  const a = Float32Array.from([1, N, 3, 4]);
  const b = Float32Array.from([1, 2, N, 4]);

  it('loop: hides the masked pixels of the shown frame only', () => {
    expect(Array.from(hiddenMask('loop', [a, b], 0))).toEqual([0, 1, 0, 0]);
    expect(Array.from(hiddenMask('loop', [a, b], 1))).toEqual([0, 0, 1, 0]);
  });

  it('difference: hides a pixel when either frame is masked', () => {
    expect(Array.from(hiddenMask('difference', [a, b], 1))).toEqual([0, 1, 1, 0]);
  });

  it('colour: hides a pixel when the first or the last frame is masked', () => {
    expect(Array.from(hiddenMask('colour', [a, b], 0))).toEqual([0, 1, 1, 0]);
  });

  it('clamps the frame index to the series', () => {
    expect(Array.from(hiddenMask('loop', [a, b], 9))).toEqual([0, 0, 1, 0]);
  });
});

describe('hiddenEdges', () => {
  it('outlines a single hidden cell with its four sides', () => {
    const mask = Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    const edges = hiddenEdges(mask, 3, 3);
    expect(edges).toHaveLength(4);
    expect(edges).toContainEqual({ x0: 1, y0: 1, x1: 2, y1: 1 });
    expect(edges).toContainEqual({ x0: 1, y0: 2, x1: 2, y1: 2 });
    expect(edges).toContainEqual({ x0: 1, y0: 1, x1: 1, y1: 2 });
    expect(edges).toContainEqual({ x0: 2, y0: 1, x1: 2, y1: 2 });
  });

  it('does not draw the shared side between two hidden cells', () => {
    const mask = Uint8Array.from([1, 1]);
    expect(hiddenEdges(mask, 2, 1)).toHaveLength(6);
  });

  it('returns no edges when nothing is hidden', () => {
    expect(hiddenEdges(new Uint8Array(4), 2, 2)).toEqual([]);
  });
});

describe('helpers', () => {
  it('counts hidden pixels', () => {
    expect(countHidden(Uint8Array.from([1, 0, 1, 1]))).toBe(3);
  });

  it('flips rows like the renderer (FITS row 0 is south)', () => {
    const mask = Uint8Array.from([1, 0, 0, 0, 0, 0]);
    expect(Array.from(flipMaskRows(mask, 2, 3))).toEqual([0, 0, 0, 1, 0, 0]);
  });

  it('uses a hidden fill that is not black, so it cannot be read as empty sky', () => {
    expect(HIDDEN_FILL_RGB.some(c => c > 30)).toBe(true);
  });

  it('explains why pixels are hidden and that they are not measured', () => {
    expect(HIDDEN_LEGEND).toMatch(/hidden on purpose/i);
    expect(HIDDEN_LEGEND).toMatch(/too bright|saturated/i);
    expect(HIDDEN_LEGEND).toMatch(/not measured/i);
  });
});

/** 5×5 frame (already display-stretched, 0..1) with a 3×3 hidden centre and a uniform rim. */
function ringed(rim: number): Float32Array {
  const f = new Float32Array(25).fill(0.05);
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
    if (x >= 1 && x <= 3 && y >= 1 && y <= 3) f[y * 5 + x] = Number.NaN;
    else f[y * 5 + x] = rim;
  }
  return f;
}

describe('brightCoreMask', () => {
  it('marks a hidden blob whose visible rim is bright (saturated star centre)', () => {
    const mask = brightCoreMask(ringed(0.9), 5, 5);
    expect(countHidden(mask)).toBe(9);
    expect(mask[12]).toBe(1);
  });

  it('leaves a hidden blob on dark sky alone (flagged pixels, not a bright star)', () => {
    expect(countHidden(brightCoreMask(ringed(0.2), 5, 5))).toBe(0);
  });

  it('judges each blob on its own rim', () => {
    const f = new Float32Array(7 * 3).fill(0.1);
    f[1 * 7 + 1] = Number.NaN;
    for (const i of [0, 1, 2, 7, 9, 14, 15, 16]) f[i] = 0.95;
    f[1 * 7 + 5] = Number.NaN;
    const mask = brightCoreMask(f, 7, 3);
    expect(mask[1 * 7 + 1]).toBe(1);
    expect(mask[1 * 7 + 5]).toBe(0);
  });

  it('uses a threshold measured on the demo data (bright cores >= 0.76, other blobs <= 0.67)', () => {
    expect(BRIGHT_RIM_THRESHOLD).toBeGreaterThan(0.67);
    expect(BRIGHT_RIM_THRESHOLD).toBeLessThan(0.76);
  });
});

describe('hiddenLayers', () => {
  const limits = { lo: 0, hi: 1 };
  const sat = ringed(5);
  const sky = new Float32Array(25).fill(0.01);

  it('loop: the bright core of the shown frame is a saturated core', () => {
    const { hidden, bright } = hiddenLayers('loop', [sat, sky], 0, limits, 5, 5);
    expect(countHidden(hidden)).toBe(9);
    expect(countHidden(bright)).toBe(9);
  });

  it('colour: a core saturated in either epoch counts as saturated', () => {
    const { hidden, bright } = hiddenLayers('colour', [sky, sat], 0, limits, 5, 5);
    expect(countHidden(hidden)).toBe(9);
    expect(countHidden(bright)).toBe(9);
  });

  it('bright is always a subset of hidden', () => {
    const { hidden, bright } = hiddenLayers('difference', [sat, sat], 1, limits, 5, 5);
    for (let i = 0; i < 25; i += 1) expect(bright[i] <= hidden[i]).toBe(true);
  });
});

describe('saturated core legend', () => {
  it('says the white centre is too bright and not measured', () => {
    expect(SATURATED_CORE_LEGEND).toMatch(/white/i);
    expect(SATURATED_CORE_LEGEND).toMatch(/too bright/i);
    expect(SATURATED_CORE_LEGEND).toMatch(/not measured/i);
  });
});

describe('quietFillFor', () => {
  it('stays near the black sky floor in loop and colour views', () => {
    for (const mode of ['loop', 'colour'] as const) expect(Math.max(...quietFillFor(mode))).toBeLessThan(40);
  });

  it('in the difference view is neither the grey "no change" midpoint nor black', () => {
    const [r, g, b] = quietFillFor('difference');
    expect(Math.abs(r - 128) + Math.abs(g - 128) + Math.abs(b - 128)).toBeGreaterThan(90);
    expect(Math.max(r, g, b)).toBeGreaterThan(40);
    expect(r === g || Math.abs(r - b) < 16).toBe(true);
  });

  it('explains the no-data grey of the difference view', () => {
    expect(NO_DATA_LEGEND).toMatch(/no data/i);
    expect(NO_DATA_LEGEND).toMatch(/not a change/i);
  });
});
