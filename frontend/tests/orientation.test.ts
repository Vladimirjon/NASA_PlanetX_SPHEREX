import { expect, it } from 'vitest';
import fixtures from './fixtures/wcs-orientation.json';
import { pointAt } from '../src/engine/core/tiles/selection';
import { DEFAULT_VIEW, type Projection } from '../src/engine/view-state';
it('matches east-left pixel positions from astropy WCS at equatorial and polar centers', () => {
  for (const ref of fixtures) {
    const fov=30, projection=ref.projection as Projection, angle=fov*Math.PI/180;
    const scale=projection==='SIN'?Math.sin(angle/2):projection==='TAN'?Math.tan(angle/2):2*Math.SQRT2*fov/360;
    const x=400+400*ref.pixel[0]*Math.PI/180/scale, y=300-400*ref.pixel[1]*Math.PI/180/scale;
    const actual=pointAt({...DEFAULT_VIEW,ra:ref.center[0],dec:ref.center[1],fov,proj:projection},x,y,800,600);
    expect(actual).not.toBeNull();
    if (!actual) throw new Error('Projection returned no sky');
    const delta=((actual.ra-ref.sky[0]+540)%360)-180;
    expect(Math.abs(delta)*Math.cos(ref.sky[1]*Math.PI/180)).toBeLessThan(1e-7);
    expect(actual.dec).toBeCloseTo(ref.sky[1],7);
  }
});
it('moves sky under a horizontal drag in the same direction as the finger', async () => {
  const { pan } = await import('../src/engine/core/camera/camera');
  const view={...DEFAULT_VIEW,ra:10,dec:0,fov:10};
  const before=pointAt(view,500,300,800,600);
  const after=pointAt(pan(view,40,0,800),540,300,800,600);
  if (!before || !after) throw new Error('No sky');
  expect(Math.abs(before.ra-after.ra)).toBeLessThan(0.01);
});
