import { expect, it } from 'vitest';
import fixture from './fixtures/healpix.json';
import { ang2pix } from '../src/engine/core/healpix/nested';
it('matches astropy-healpix for deterministic sky coordinates', () => {
  for (const [order, ra, dec, expected] of fixture) expect(ang2pix(order, ra, dec)).toBe(expected);
});
