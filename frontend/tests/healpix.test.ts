import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import fixture from './fixtures/healpix.json';
import { ang2pix, pix2ang } from '../src/engine/core/healpix/nested';
it('matches astropy-healpix for deterministic sky coordinates', () => {
  for (const [order, ra, dec, expected] of fixture) expect(ang2pix(order, ra, dec)).toBe(expected);
});

it('matches one million deterministic maximum-order Astropy references', async () => {
  const pixels = await fs.readFile(join(process.cwd(), 'tests/fixtures/healpix-million.bin'));
  expect(pixels.length).toBe(2_000_000);
  let seed = 1842;
  for (let i = 0; i < 1_000_000; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const ra = seed / 2 ** 32 * 360;
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const dec = seed / 2 ** 32 * 180 - 90;
    if (ang2pix(5, ra, dec) !== pixels.readUInt16LE(i * 2)) throw new Error(`HEALPix mismatch at sample ${i}`);
  }
}, 30000);

it('matches every order-5 center from Astropy', async () => {
  const data = await fs.readFile(join(process.cwd(), 'tests/fixtures/healpix-centers.bin'));
  expect(data.length).toBe(12288 * 16);
  for (let pixel = 0; pixel < 12288; pixel++) {
    const point = pix2ang(5, pixel);
    expect(point.ra).toBeCloseTo(data.readDoubleLE(pixel * 16), 9);
    expect(point.dec).toBeCloseTo(data.readDoubleLE(pixel * 16 + 8), 9);
  }
});
