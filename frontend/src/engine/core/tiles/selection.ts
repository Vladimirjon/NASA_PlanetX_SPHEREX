import { ang2pix } from '../healpix/nested';
import { project, unproject } from '../projections/math';
import { maxFov, type ViewState } from '../../view-state';

export function selectOrder(fov: number, width: number): number {
  return Math.max(0, Math.min(5, Math.ceil(Math.log2(Math.max(1, width) * 58.63 / (512 * Math.max(fov, 0.001))))));
}

function scaleFor(view: Readonly<ViewState>): number {
  const fov = Math.min(view.fov, maxFov(view.proj)) * Math.PI / 180;
  if (view.proj === 'SIN') return Math.sin(Math.min(fov, Math.PI) / 2);
  if (view.proj === 'TAN') return Math.tan(Math.min(fov, Math.PI / 2 * 0.999) / 2);
  return 2 * Math.SQRT2 * Math.min(fov / (2 * Math.PI), 1);
}

export function pointAt(view: Readonly<ViewState>, x: number, y: number, width: number, height: number): { ra: number; dec: number } | null {
  if (width <= 0 || height <= 0) return null;
  const scale = scaleFor(view);
  return unproject(view.proj, (1 - 2 * x / width) * scale, (1 - 2 * y / height) * scale * height / width, view.ra, view.dec);
}

export interface VisibleCell { readonly order: number; readonly npix: number; readonly distance: number }

/** Sampling approximation; this is not a complete cell intersection test. */
export function visibleCells(view: Readonly<ViewState>, width: number, height: number, order: number): VisibleCell[] {
  const result = new Map<string, VisibleCell>();
  for (let iy = 0; iy <= 20; iy++) for (let ix = 0; ix <= 20; ix++) {
    const x = width * ix / 20;
    const y = height * iy / 20;
    const point = pointAt(view, x, y, width, height);
    if (!point) continue;
    for (const level of new Set([order, Math.max(0, order - 1), Math.min(order, 2)])) {
      const npix = ang2pix(level, point.ra, point.dec);
      const key = `${level}/${npix}`;
      const distance = (x - width / 2) ** 2 + (y - height / 2) ** 2;
      if (distance < (result.get(key)?.distance ?? Infinity)) result.set(key, { order: level, npix, distance });
    }
  }
  return [...result.values()].sort((a, b) => b.order - a.order || a.distance - b.distance);
}

export function screenAt(view: Readonly<ViewState>, ra: number, dec: number, width: number, height: number): { x: number; y: number } | null {
  const scale = scaleFor(view);
  const point = project(view.proj, ra, dec, view.ra, view.dec);
  if (!point) return null;
  return { x: width * (1 - point.x / scale) / 2, y: height / 2 - width * point.y / (2 * scale) };
}
