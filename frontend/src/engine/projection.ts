import type { Projection } from './view-state';

const RAD = Math.PI / 180;
type Vector = [number, number, number];
function basis(ra: number, dec: number): [Vector, Vector, Vector] {
  const a = ra * RAD, d = dec * RAD;
  return [[Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)],
    [-Math.sin(a), Math.cos(a), 0],
    [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)]];
}
function dot(a: Vector, b: Vector): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Projection coordinates are dimensionless; caller provides viewport scaling. */
export function project(proj: Projection, ra: number, dec: number, centerRa: number, centerDec: number): { x: number; y: number } | null {
  const [center, east, north] = basis(centerRa, centerDec);
  const [v] = basis(ra, dec);
  const c = dot(v, center), e = dot(v, east), n = Math.max(-1, Math.min(1, dot(v, north)));
  if (proj === 'SIN') return c < 0 ? null : { x: e, y: n };
  if (proj === 'TAN') return c <= 0 ? null : { x: e / c, y: n / c };
  const lon = Math.atan2(e, c), lat = Math.asin(n);
  const denominator = Math.sqrt(1 + Math.cos(lat) * Math.cos(lon / 2));
  return { x: 2 * Math.SQRT2 * Math.cos(lat) * Math.sin(lon / 2) / denominator,
    y: Math.SQRT2 * Math.sin(lat) / denominator };
}

export function unproject(proj: Projection, x: number, y: number, centerRa: number, centerDec: number): { ra: number; dec: number } | null {
  let c: number, e: number, n: number;
  if (proj === 'SIN') {
    const r2 = x * x + y * y;
    if (r2 > 1) return null;
    c = Math.sqrt(1 - r2); e = x; n = y;
  } else if (proj === 'TAN') {
    c = 1 / Math.sqrt(1 + x * x + y * y); e = x * c; n = y * c;
  } else {
    // Hammer-Aitoff ellipse: x²/8 + y²/2 ≤ 1.
    if (x * x / 8 + y * y / 2 > 1) return null;
    const z = Math.sqrt(Math.max(0, 1 - x * x / 16 - y * y / 4));
    const lon = 2 * Math.atan2(z * x, 2 * (2 * z * z - 1));
    const lat = Math.asin(Math.max(-1, Math.min(1, z * y)));
    c = Math.cos(lat) * Math.cos(lon); e = Math.cos(lat) * Math.sin(lon); n = Math.sin(lat);
  }
  const [center, east, north] = basis(centerRa, centerDec);
  const v: Vector = [0, 1, 2].map(i => c * center[i] + e * east[i] + n * north[i]) as Vector;
  return { ra: (Math.atan2(v[1], v[0]) / RAD + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD };
}
