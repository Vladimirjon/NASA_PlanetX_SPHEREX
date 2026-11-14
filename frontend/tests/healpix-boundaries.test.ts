import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import fixtures from './fixtures/healpix-boundaries.json';
import { corners, neighbours } from '../src/engine/core/healpix/nested';
it('matches Astropy corners and neighbouring cells', () => {
  for (const reference of fixtures) {
    const actual = corners(5, reference.pixel);
    for (const [ra,dec] of reference.corners) {
      expect(actual.some(p => Math.abs(p.dec-dec)<1e-7 && (Math.abs((((p.ra-ra)+540)%360)-180)<1e-7 || Math.abs(dec)>89.999999))).toBe(true);
    }
    expect(neighbours(5,reference.pixel).sort((a,b)=>a-b)).toEqual(reference.neighbours.sort((a,b)=>a-b));
  }
});
it('matches all order-5 neighbours from Astropy', async () => {
  const data=await fs.readFile(join(process.cwd(),'tests/fixtures/healpix-neighbours.bin'));
  for (let pixel=0;pixel<12288;pixel++) {
    const expected=Array.from({length:8},(_,i)=>data.readInt16LE(pixel*16+i*2)).filter(x=>x>=0).sort((a,b)=>a-b);
    const actual=neighbours(5,pixel).sort((a,b)=>a-b);
    if (String(actual)!==String(expected)) throw new Error(`Pixel ${pixel}: ${actual.join(',')} vs ${expected.join(',')}`);
  }
});
