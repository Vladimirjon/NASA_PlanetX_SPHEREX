import { it } from 'vitest';
import fc from 'fast-check';
import { project, unproject } from '../src/engine/projection';
import type { Projection } from '../src/engine/view-state';
it.each<Projection>(['SIN', 'TAN', 'AIT'])('%s round trips 10000 randomly generated screen points', projection => {
  fc.assert(fc.property(
    fc.double({min:-0.65,max:0.65,noNaN:true}), fc.double({min:-0.65,max:0.65,noNaN:true}),
    fc.double({min:0,max:359.999,noNaN:true}), fc.double({min:-89.9,max:89.9,noNaN:true}),
    (x,y,ra,dec) => {
      const sky=unproject(projection,x,y,ra,dec);
      if (!sky) return false;
      const point=project(projection,sky.ra,sky.dec,ra,dec);
      return point !== null && Math.hypot(point.x-x,point.y-y)*1000 < 0.01;
    }), {numRuns:10000,seed:8431});
});
