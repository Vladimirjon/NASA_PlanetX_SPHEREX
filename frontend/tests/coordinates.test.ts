import { expect, it } from 'vitest';
import fc from 'fast-check';
import { coordinates } from '../src/engine/core/camera/coordinates';
it('carries rounded seconds and preserves negative zero declinations',()=>{
 expect(coordinates(359.9999999,-.5)).toContain('00h 00m 00.0s  −00° 30′ 00.0″  (0.00000°');
 expect(coordinates(.24999999,-.999999)).toContain('00h 01m 00.0s  −01° 00′ 00.0″');
});
it('never prints a seconds or minutes field of sixty',()=>{
 fc.assert(fc.property(fc.double({min:0,max:360,noNaN:true}),fc.double({min:-90,max:90,noNaN:true}),(ra,dec)=>!/(?:\b60m|\b60\.0s|\b60′|\b60\.0″)/.test(coordinates(ra,dec))),{numRuns:10000});
});
