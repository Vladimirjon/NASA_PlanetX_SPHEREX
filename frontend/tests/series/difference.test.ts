import { describe, expect, it } from 'vitest';
import { differenceFrame } from '../../src/series/core/difference';

describe('differenceFrame', () => {
  it('computes B − A with NaN propagation', () => {
    const a = Float32Array.from([1, Number.NaN, 3]);
    const b = Float32Array.from([4, 5, Number.NaN]);
    const d = differenceFrame(b, a);
    expect(d[0]).toBeCloseTo(3);
    expect(Number.isNaN(d[1])).toBe(true);
    expect(Number.isNaN(d[2])).toBe(true);
  });

  it('rejects length mismatch', () => {
    expect(() => differenceFrame(new Float32Array(2), new Float32Array(3))).toThrow(/length/i);
  });
});
