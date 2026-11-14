import { describe, expect, it } from 'vitest';
import { colourComposite, COLOUR_LEGEND } from '../../src/series/core/colour';

describe('colourComposite', () => {
  it('maps first epoch to magenta and last to green', () => {
    const first = Float32Array.from([1, 0]);
    const last = Float32Array.from([0, 1]);
    const rgba = colourComposite(first, last);
    // pixel 0: magenta (R+B), no green
    expect(rgba[0]).toBe(255);
    expect(rgba[1]).toBe(0);
    expect(rgba[2]).toBe(255);
    expect(rgba[3]).toBe(255);
    // pixel 1: green
    expect(rgba[4]).toBe(0);
    expect(rgba[5]).toBe(255);
    expect(rgba[6]).toBe(0);
  });

  it('exposes a colour-blind-safe text legend', () => {
    expect(COLOUR_LEGEND).toMatch(/magenta/i);
    expect(COLOUR_LEGEND).toMatch(/green/i);
    expect(COLOUR_LEGEND).toMatch(/first/i);
    expect(COLOUR_LEGEND).toMatch(/last/i);
  });
});
