import { maxFov, type ViewState } from '../../view-state';
import { pointAt, screenAt } from '../tiles/selection';

export { maxFov };

type Vec3 = readonly [number, number, number];

export function clampView(view: Readonly<ViewState>): ViewState {
  return {
    ...view,
    ra: ((view.ra % 360) + 360) % 360,
    dec: Math.max(-90, Math.min(90, view.dec)),
    fov: Math.max(0.05, Math.min(maxFov(view.proj), view.fov)),
  };
}

function toVec(ra: number, dec: number): Vec3 {
  const a = ra * Math.PI / 180;
  const d = dec * Math.PI / 180;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

function fromVec(v: Vec3): { ra: number; dec: number } {
  const norm = Math.hypot(v[0], v[1], v[2]);
  if (norm === 0) return { ra: 0, dec: 0 };
  const x = v[0] / norm;
  const y = v[1] / norm;
  const z = v[2] / norm;
  return {
    ra: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360,
    dec: Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI,
  };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Rotate `v` by the unique rotation that takes `from` onto `to` (Rodrigues). */
export function rotateVec(v: Vec3, from: Vec3, to: Vec3): Vec3 {
  const fromN = Math.hypot(from[0], from[1], from[2]);
  const toN = Math.hypot(to[0], to[1], to[2]);
  if (fromN === 0 || toN === 0) return v;
  const a: Vec3 = [from[0] / fromN, from[1] / fromN, from[2] / fromN];
  const b: Vec3 = [to[0] / toN, to[1] / toN, to[2] / toN];
  const cos = Math.max(-1, Math.min(1, dot(a, b)));
  if (cos > 0.999999) return v;
  if (cos < -0.999999) {
    const axis = Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]);
    const axisN = Math.hypot(axis[0], axis[1], axis[2]);
    const u: Vec3 = [axis[0] / axisN, axis[1] / axisN, axis[2] / axisN];
    return [
      2 * u[0] * dot(u, v) - v[0],
      2 * u[1] * dot(u, v) - v[1],
      2 * u[2] * dot(u, v) - v[2],
    ];
  }
  const axis = cross(a, b);
  const sin = Math.hypot(axis[0], axis[1], axis[2]);
  const u: Vec3 = [axis[0] / sin, axis[1] / sin, axis[2] / sin];
  const k = 1 - cos;
  return [
    v[0] * (u[0] * u[0] * k + cos) + v[1] * (u[0] * u[1] * k - u[2] * sin) + v[2] * (u[0] * u[2] * k + u[1] * sin),
    v[0] * (u[1] * u[0] * k + u[2] * sin) + v[1] * (u[1] * u[1] * k + cos) + v[2] * (u[1] * u[2] * k - u[0] * sin),
    v[0] * (u[2] * u[0] * k - u[1] * sin) + v[1] * (u[2] * u[1] * k + u[0] * sin) + v[2] * (u[2] * u[2] * k + cos),
  ];
}

/**
 * Adjust the north-up centre so `sky` stays under screen pixel (x, y).
 * Solves screenAt(centre, sky) = (x, y) with a damped Newton step in (ra, dec).
 * When the grab is near a pole, a celestial rotation seeds the next centre so the
 * Jacobian stays well-conditioned (no RA/Dec delta pan).
 */
export function keepPointUnder(
  view: Readonly<ViewState>,
  sky: { readonly ra: number; readonly dec: number },
  x: number,
  y: number,
  width: number,
  height: number,
): ViewState {
  let current = clampView(view);
  const target = toVec(sky.ra, sky.dec);
  for (let step = 0; step < 24; step++) {
    const screen = screenAt(current, sky.ra, sky.dec, width, height);
    if (!screen) {
      const at = pointAt(current, x, y, width, height);
      if (!at) return current;
      const next = fromVec(rotateVec(toVec(current.ra, current.dec), toVec(at.ra, at.dec), target));
      current = { ...current, ra: next.ra, dec: next.dec };
      continue;
    }
    const ex = screen.x - x;
    const ey = screen.y - y;
    const err = Math.hypot(ex, ey);
    if (err < 1e-4) return current;

    const eps = err > 2 ? 1e-3 : 1e-4;
    const sx = screenAt({ ...current, ra: (current.ra + eps + 360) % 360 }, sky.ra, sky.dec, width, height);
    const syDec = Math.max(-90, Math.min(90, current.dec + eps));
    const sy = screenAt({ ...current, dec: syDec }, sky.ra, sky.dec, width, height);
    if (!sx || !sy) {
      const at = pointAt(current, x, y, width, height);
      if (!at) return current;
      const next = fromVec(rotateVec(toVec(current.ra, current.dec), toVec(at.ra, at.dec), target));
      current = { ...current, ra: next.ra, dec: next.dec };
      continue;
    }
    const j11 = (sx.x - screen.x) / eps;
    const j21 = (sx.y - screen.y) / eps;
    const j12 = (sy.x - screen.x) / (syDec - current.dec || eps);
    const j22 = (sy.y - screen.y) / (syDec - current.dec || eps);
    const det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-14) {
      const at = pointAt(current, x, y, width, height);
      if (!at) return current;
      const next = fromVec(rotateVec(toVec(current.ra, current.dec), toVec(at.ra, at.dec), target));
      current = { ...current, ra: next.ra, dec: next.dec };
      continue;
    }
    // J * [dra, ddec]^T = -[ex, ey]^T
    let dra = (-ex * j22 + ey * j12) / det;
    let ddec = (ex * j21 - ey * j11) / det;
    const stepLen = Math.hypot(dra, ddec);
    if (stepLen > 15) {
      dra *= 15 / stepLen;
      ddec *= 15 / stepLen;
    }
    let best = current;
    let bestErr = err;
    for (const scale of [1, 0.5, 0.25, 0.125]) {
      const candidate = clampView({
        ...current,
        ra: current.ra + dra * scale,
        dec: current.dec + ddec * scale,
      });
      const placed = screenAt(candidate, sky.ra, sky.dec, width, height);
      if (!placed) continue;
      const candidateErr = Math.hypot(placed.x - x, placed.y - y);
      if (candidateErr < bestErr) {
        best = candidate;
        bestErr = candidateErr;
      }
    }
    if (bestErr >= err - 1e-12) {
      const at = pointAt(current, x, y, width, height);
      if (!at) return current;
      const next = fromVec(rotateVec(toVec(current.ra, current.dec), toVec(at.ra, at.dec), target));
      current = { ...current, ra: next.ra, dec: next.dec };
      continue;
    }
    current = best;
  }
  return current;
}

/** Drag so the sky point under (fromX, fromY) ends under (toX, toY). */
export function drag(
  view: Readonly<ViewState>,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
): ViewState {
  const grab = pointAt(view, fromX, fromY, width, height);
  if (!grab) return { ...view };
  if (!pointAt(view, toX, toY, width, height)) return { ...view };
  return keepPointUnder(view, grab, toX, toY, width, height);
}

/** Legacy delta pan used by keyboard nudges (north-up, small steps). */
export function pan(view: Readonly<ViewState>, dx: number, dy: number, width: number): ViewState {
  const factor = Math.min(maxFov(view.proj), view.fov) * Math.PI / (180 * Math.max(1, width));
  const a = view.ra * Math.PI / 180;
  const d = view.dec * Math.PI / 180;
  const center: Vec3 = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const east: Vec3 = [-Math.sin(a), Math.cos(a), 0];
  const north: Vec3 = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const magnitude = Math.hypot(dx, dy);
  if (magnitude === 0) return { ...view };
  const angle = magnitude * factor;
  const s = Math.sin(angle) / magnitude;
  const c = Math.cos(angle);
  const x = c * center[0] + s * (dx * east[0] + dy * north[0]);
  const y = c * center[1] + s * (dx * east[1] + dy * north[1]);
  const z = c * center[2] + s * (dx * east[2] + dy * north[2]);
  return clampView({
    ...view,
    ra: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360,
    dec: Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI,
  });
}

export function zoom(view: Readonly<ViewState>, factor: number): ViewState {
  return clampView({ ...view, fov: view.fov * factor });
}

/** Zoom while keeping the sky point under (x, y) fixed on screen. */
export function zoomAt(
  view: Readonly<ViewState>,
  factor: number,
  x: number,
  y: number,
  width: number,
  height: number,
): ViewState {
  const grab = pointAt(view, x, y, width, height);
  const next = zoom(view, factor);
  if (!grab) return next;
  return keepPointUnder(next, grab, x, y, width, height);
}

/** Great-circle slerp of centre + log-interpolated FOV (t in [0,1]). */
export function interpolateView(from: Readonly<ViewState>, to: Readonly<ViewState>, t: number): ViewState {
  const u = Math.max(0, Math.min(1, t));
  const a = toVec(from.ra, from.dec);
  const b = toVec(to.ra, to.dec);
  const cos = Math.max(-1, Math.min(1, dot(a, b)));
  const omega = Math.acos(cos);
  let centre: Vec3;
  if (omega < 1e-8) centre = a;
  else {
    const s = Math.sin(omega);
    const w0 = Math.sin((1 - u) * omega) / s;
    const w1 = Math.sin(u * omega) / s;
    centre = [w0 * a[0] + w1 * b[0], w0 * a[1] + w1 * b[1], w0 * a[2] + w1 * b[2]];
  }
  const { ra, dec } = fromVec(centre);
  const fov = Math.exp(Math.log(from.fov) * (1 - u) + Math.log(to.fov) * u);
  return clampView({ ...from, ra, dec, fov, plane: to.plane, proj: to.proj });
}
