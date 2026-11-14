import { expect, it } from 'vitest';
import { parentCell } from '../src/engine/core/tiles/fallback';
it('walks a missing deep tile toward its coarser ancestor',()=>{
 expect(parentCell({order:5,npix:10226,distance:1})).toEqual({order:4,npix:2556,distance:1});
 expect(parentCell({order:0,npix:2,distance:1})).toBeNull();
});
