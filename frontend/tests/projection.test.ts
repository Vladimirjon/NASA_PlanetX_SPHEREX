import { describe, expect, it } from 'vitest';
import { project, unproject } from '../src/engine/projection';
import type { Projection } from '../src/engine/view-state';

describe.each<Projection>(['SIN', 'TAN', 'AIT'])('%s projection', (projection) => {
  it('round trips ten thousand sky positions around a polar center', () => {
    let seed = 123456789;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
    let checked = 0;
    for (let i = 0; i < 10000; i++) {
      const x = (random() - 0.5) * (projection === 'AIT' ? 5 : 1.4);
      const y = (random() - 0.5) * (projection === 'AIT' ? 2.5 : 1.4);
      const sky = unproject(projection, x, y, 359.99, 89.999);
      if (!sky) continue;
      const point = project(projection, sky.ra, sky.dec, 359.99, 89.999);
      expect(point).not.toBeNull();
      expect(Math.hypot(point!.x - x, point!.y - y) * 1000).toBeLessThan(0.01);
      checked++;
    }
    expect(checked).toBeGreaterThan(5000);
  });
  it('maps the center to itself across RA wrap', () => {
    const sky = unproject(projection, 0, 0, 359.99, -90);
    expect(sky?.dec).toBeCloseTo(-90, 5);
    expect(project(projection, 359.99, -90, 359.99, -90)?.x).toBeCloseTo(0);
  });
});
