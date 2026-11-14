import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asinhStretch, seriesStretchLimits, stretchFrame } from '../../src/series/core/stretch';

describe('seriesStretchLimits', () => {
  it('uses shared p01/p99 across frames (never per-frame)', () => {
    const limits = seriesStretchLimits([
      { p01: 0, p50: 1, p99: 10, masked_fraction: 0 },
      { p01: -1, p50: 2, p99: 20, masked_fraction: 0 },
      { p01: 0.5, p50: 1, p99: 5, masked_fraction: 0 },
    ]);
    expect(limits.lo).toBe(-1);
    expect(limits.hi).toBe(20);
  });
});

describe('asinhStretch', () => {
  it('maps lo→0 and hi→1 and preserves NaN', () => {
    expect(asinhStretch(0, 0, 10)).toBeCloseTo(0, 5);
    expect(asinhStretch(10, 0, 10)).toBeCloseTo(1, 5);
    expect(Number.isNaN(asinhStretch(Number.NaN, 0, 10))).toBe(true);
  });

  it('is monotonic for finite values in range', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), fc.float({ min: 0, max: 1, noNaN: true }), (a, b) => {
        const lo = 0;
        const hi = 10;
        const va = lo + a * (hi - lo);
        const vb = lo + b * (hi - lo);
        const sa = asinhStretch(va, lo, hi);
        const sb = asinhStretch(vb, lo, hi);
        expect(Math.sign(sa - sb)).toBe(Math.sign(va - vb) || 0);
      }),
    );
  });
});

describe('stretchFrame', () => {
  it('applies the same limits to every frame', () => {
    const limits = { lo: 0, hi: 10 };
    const a = stretchFrame(Float32Array.from([0, 5, 10]), limits);
    const b = stretchFrame(Float32Array.from([0, 5, 10]), limits);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a[1]).toBeGreaterThan(0);
    expect(a[1]).toBeLessThan(1);
  });
});
