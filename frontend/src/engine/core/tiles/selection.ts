export function selectOrder(fov: number, width: number): number {
  return Math.max(0, Math.min(5, Math.ceil(Math.log2(Math.max(1, width) * 58.63 / (512 * Math.max(fov, 0.001))))));
}

import { ang2pix } from '../healpix/nested';
import { unproject } from '../projections/math';
import type { ViewState } from '../../view-state';
export function pointAt(view: Readonly<ViewState>, x: number, y: number, width: number, height: number): {ra:number;dec:number} | null {
  if (width <= 0 || height <= 0) return null;
  const projection = view.proj === 'SIN' && view.fov > 180 ? 'AIT' : view.proj;
  const fov = view.fov * Math.PI / 180;
  const scale = projection === 'SIN' ? Math.sin(Math.min(fov, Math.PI) / 2) : projection === 'TAN' ? Math.tan(Math.min(fov, 2.6) / 2) : 2 * Math.SQRT2 * Math.min(fov / (2 * Math.PI), 1);
  return unproject(projection, (2*x/width-1)*scale, (1-2*y/height)*scale*height/width, view.ra, view.dec);
}
export interface VisibleCell { readonly order:number; readonly npix:number; readonly distance:number }
/** Sampling approximation; this is not a complete cell intersection test. */
export function visibleCells(view: Readonly<ViewState>, width: number, height: number, order: number): VisibleCell[] {
  const result = new Map<string, VisibleCell>();
  for (let pixel=0;pixel<12;pixel++) result.set(`0/${pixel}`,{order:0,npix:pixel,distance:Infinity});
  for(let iy=0;iy<=20;iy++) for(let ix=0;ix<=20;ix++) {
    const x=width*ix/20,y=height*iy/20,point=pointAt(view,x,y,width,height);if(!point) continue;
    for(let level=1;level<=order;level++) {
      const npix=ang2pix(level,point.ra,point.dec),key=`${level}/${npix}`,distance=(x-width/2)**2+(y-height/2)**2;
      if(distance<(result.get(key)?.distance ?? Infinity)) result.set(key,{order:level,npix,distance});
    }
  }
  return [...result.values()].sort((a,b)=>a.order-b.order || a.distance-b.distance);
}
