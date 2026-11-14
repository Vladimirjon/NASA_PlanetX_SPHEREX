import { expect, it } from 'vitest';
import { visibleCells } from '../src/engine/core/tiles/selection';
import { DEFAULT_VIEW } from '../src/engine/view-state';
it('includes the center across RA wrap and at both poles', () => {
  for (const [ra,dec] of [[359.99,0],[0.01,0],[0,90],[359.99,-90]]) {
    const cells=visibleCells({...DEFAULT_VIEW,ra,dec,fov:1},800,600,5);
    expect(cells.some(cell=>cell.order===5 && cell.distance===0)).toBe(true);
    expect(cells.every(cell=>cell.npix>=0 && cell.npix<12*4**cell.order)).toBe(true);
  }
});
