import { describe, expect, it } from 'vitest';
import { decodeFloat32LE, flipRowsNorthUp } from '../../src/series/core/decode';

describe('decodeFloat32LE', () => {
  it('decodes little-endian Float32 row-major', () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat32(0, 1.5, true);
    view.setFloat32(4, Number.NaN, true);
    const out = decodeFloat32LE(buf, 1, 2);
    expect(out[0]).toBeCloseTo(1.5);
    expect(Number.isNaN(out[1])).toBe(true);
  });

  it('rejects wrong byte length', () => {
    expect(() => decodeFloat32LE(new ArrayBuffer(4), 2, 2)).toThrow(/byte length/i);
  });
});

describe('flipRowsNorthUp', () => {
  it('puts former south-edge row at the top after flip', () => {
    // Row 0 = south in FITS; after flip, row 0 (display) = former last row (north)
    const src = Float32Array.from([0, 1, 10, 11]);
    const flipped = flipRowsNorthUp(src, 2, 2);
    expect(Array.from(flipped)).toEqual([10, 11, 0, 1]);
  });
});
