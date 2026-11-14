import { project, unproject } from './math';
import type { Projection as ProjectionName } from '../../view-state';
export interface Projection {
  readonly name: string;
  project(ra: number, dec: number, centerRa: number, centerDec: number): { x: number; y: number } | null;
  unproject(x: number, y: number, centerRa: number, centerDec: number): { ra: number; dec: number } | null;
  isVisible(ra: number, dec: number, centerRa: number, centerDec: number): boolean;
  readonly bounds: readonly [number, number];
}
const make = (name: ProjectionName, bounds: readonly [number, number]): Projection => ({
  name, bounds,
  project: (ra, dec, cr, cd) => project(name, ra, dec, cr, cd),
  unproject: (x, y, cr, cd) => unproject(name, x, y, cr, cd),
  isVisible: (ra, dec, cr, cd) => project(name, ra, dec, cr, cd) !== null,
});
export function createProjectionRegistry(extra: readonly Projection[] = []): ReadonlyMap<string, Projection> {
  return new Map([make('SIN', [1, 1]), make('TAN', [Infinity, Infinity]), make('AIT', [2 * Math.SQRT2, Math.SQRT2]), ...extra].map(p => [p.name, p]));
}
