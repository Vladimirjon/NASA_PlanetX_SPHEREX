import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { expectedMotionPixels, worldToPixel } from '../../src/series/core/tan';

describe('worldToPixel (TAN, east left, north up in FITS rows)', () => {
  const grid = {
    shape: [49, 49] as [number, number],
    crval_deg: [180, 0] as [number, number],
    pixel_scale_arcsec: 6.15,
  };

  it('places CRVAL at the grid centre', () => {
    const p = worldToPixel(180, 0, grid);
    expect(p.x).toBeCloseTo(24, 5);
    expect(p.y).toBeCloseTo(24, 5);
  });

  it('maps east (higher RA) to the left (smaller x)', () => {
    const centre = worldToPixel(180, 0, grid);
    const east = worldToPixel(180 + 6.15 / 3600, 0, grid);
    expect(east.x).toBeLessThan(centre.x);
  });

  it('maps north (higher Dec) to larger y (row 0 = south)', () => {
    const centre = worldToPixel(180, 0, grid);
    const north = worldToPixel(180, 6.15 / 3600, grid);
    expect(north.y).toBeGreaterThan(centre.y);
  });

  it('is approximately inverse for small offsets', () => {
    fc.assert(
      fc.property(fc.float({ min: -10, max: 10, noNaN: true }), fc.float({ min: -10, max: 10, noNaN: true }), (dx, dy) => {
        const ra = 180 + (dx * 6.15) / 3600;
        const dec = (dy * 6.15) / 3600;
        const p = worldToPixel(ra, dec, grid);
        expect(p.x).toBeCloseTo(24 - dx, 1);
        expect(p.y).toBeCloseTo(24 + dy, 1);
      }),
    );
  });
});

describe('expectedMotionPixels', () => {
  it('returns distance between first and last predicted positions in pixels', () => {
    const grid = {
      shape: [49, 49] as [number, number],
      crval_deg: [180, 0] as [number, number],
      pixel_scale_arcsec: 6.15,
    };
    const px = expectedMotionPixels(
      { ra: 180, dec: 0 },
      { ra: 180, dec: (2 * 6.15) / 3600 },
      grid,
    );
    expect(px).toBeCloseTo(2, 5);
  });
});
