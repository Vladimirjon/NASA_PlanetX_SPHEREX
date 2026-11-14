import { expect, it } from 'vitest';
import { pan, zoom } from '../src/engine/core/camera/camera';
import { DEFAULT_VIEW } from '../src/engine/view-state';
it('pans across RA zero and over a pole without exceeding coordinate bounds', () => {
  const across=pan({...DEFAULT_VIEW,ra:359.9,dec:0,fov:10},40,0,800);
  expect(across.ra).toBeLessThan(1);
  const polar=pan({...DEFAULT_VIEW,ra:0,dec:89.9,fov:10},0,40,800);
  expect(polar.dec).toBeLessThan(90);
  expect(polar.ra).toBeCloseTo(180,3);
});
it('clamps zoom and preserves the input view', () => {
  const input={...DEFAULT_VIEW,fov:1}; expect(zoom(input,0.00001).fov).toBe(0.05); expect(input.fov).toBe(1);
});
