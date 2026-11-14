import { expect, it } from 'vitest';
import * as fc from 'fast-check';
import { drag, interpolateView, keepPointUnder, maxFov, zoomAt, zoom } from '../src/engine/core/camera/camera';
import { pointAt, screenAt } from '../src/engine/core/tiles/selection';
import { DEFAULT_VIEW, type Projection, type ViewState } from '../src/engine/view-state';

const WIDTH = 800;
const HEIGHT = 600;

function view(partial: Partial<ViewState>): ViewState {
  return { ...DEFAULT_VIEW, fov: 40, ...partial };
}

it('never raises FOV beyond the projection maximum', () => {
  expect(maxFov('SIN')).toBe(180);
  expect(maxFov('TAN')).toBe(90);
  expect(maxFov('AIT')).toBe(360);
  expect(zoom(view({ proj: 'SIN', fov: 100 }), 10).fov).toBe(180);
  expect(zoom(view({ proj: 'TAN', fov: 60 }), 10).fov).toBe(90);
  expect(zoom(view({ proj: 'AIT', fov: 200 }), 10).fov).toBe(360);
});

it('does not switch projection when FOV would have triggered the old AIT fallback', () => {
  const start = view({ proj: 'SIN', fov: 170 });
  const next = zoom(start, 2);
  expect(next.proj).toBe('SIN');
  expect(next.fov).toBe(180);
});

it.each<Projection>(['SIN', 'TAN', 'AIT'])(
  '%s drag keeps the grabbed sky point under the pointer (< 0.5 px)',
  (proj) => {
    const max = maxFov(proj);
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 359.999, noNaN: true }),
        fc.double({ min: -80, max: 80, noNaN: true }),
        fc.double({ min: 5, max: Math.min(60, max * 0.4), noNaN: true }),
        fc.double({ min: WIDTH * 0.25, max: WIDTH * 0.75, noNaN: true }),
        fc.double({ min: HEIGHT * 0.25, max: HEIGHT * 0.75, noNaN: true }),
        fc.double({ min: -80, max: 80, noNaN: true }),
        fc.double({ min: -80, max: 80, noNaN: true }),
        (ra, dec, fov, x0, y0, dx, dy) => {
          const start = view({ ra, dec, fov, proj });
          const grab = pointAt(start, x0, y0, WIDTH, HEIGHT);
          if (!grab) return true;
          const x1 = Math.min(WIDTH - 1, Math.max(1, x0 + dx));
          const y1 = Math.min(HEIGHT - 1, Math.max(1, y0 + dy));
          if (!pointAt(start, x1, y1, WIDTH, HEIGHT)) return true;
          const moved = drag(start, x0, y0, x1, y1, WIDTH, HEIGHT);
          expect(moved.proj).toBe(proj);
          const screen = screenAt(moved, grab.ra, grab.dec, WIDTH, HEIGHT);
          if (!screen) return false;
          expect(Math.hypot(screen.x - x1, screen.y - y1)).toBeLessThan(0.5);
        },
      ),
      { numRuns: 80 },
    );
  },
);

it('drag across the north pole keeps the grab without jumping', () => {
  const start = view({ ra: 10, dec: 88, fov: 30, proj: 'SIN' });
  const x0 = WIDTH / 2;
  const y0 = HEIGHT / 2;
  const grab = pointAt(start, x0, y0, WIDTH, HEIGHT);
  expect(grab).not.toBeNull();
  if (!grab) return;
  let current = start;
  for (let step = 1; step <= 12; step++) {
    const y1 = y0 - 20 * step;
    current = keepPointUnder(current, grab, x0, y1, WIDTH, HEIGHT);
    const screen = screenAt(current, grab.ra, grab.dec, WIDTH, HEIGHT);
    expect(screen).not.toBeNull();
    if (!screen) return;
    expect(Math.hypot(screen.x - x0, screen.y - y1)).toBeLessThan(0.5);
  }
});

it('zoom stays anchored at the cursor', () => {
  const start = view({ ra: 56.75, dec: 24.12, fov: 20, proj: 'SIN' });
  const x = WIDTH * 0.62;
  const y = HEIGHT * 0.38;
  const grab = pointAt(start, x, y, WIDTH, HEIGHT);
  expect(grab).not.toBeNull();
  if (!grab) return;
  const next = zoomAt(start, 0.5, x, y, WIDTH, HEIGHT);
  expect(next.proj).toBe('SIN');
  const screen = screenAt(next, grab.ra, grab.dec, WIDTH, HEIGHT);
  expect(screen).not.toBeNull();
  if (!screen) return;
  expect(Math.hypot(screen.x - x, screen.y - y)).toBeLessThan(0.5);
});

it('keepPointUnder converges for a displaced centre', () => {
  const start = view({ ra: 120, dec: -10, fov: 25, proj: 'TAN' });
  const x = 500;
  const y = 220;
  const grab = pointAt(start, x, y, WIDTH, HEIGHT);
  expect(grab).not.toBeNull();
  if (!grab) return;
  const shifted = { ...start, ra: 125, dec: -8 };
  const fixed = keepPointUnder(shifted, grab, x, y, WIDTH, HEIGHT);
  const screen = screenAt(fixed, grab.ra, grab.dec, WIDTH, HEIGHT);
  expect(screen).not.toBeNull();
  if (!screen) return;
  expect(Math.hypot(screen.x - x, screen.y - y)).toBeLessThan(0.5);
});

it('interpolateView slerps the centre and log-interpolates FOV', () => {
  const from = view({ ra: 10, dec: 0, fov: 10, proj: 'SIN' });
  const to = view({ ra: 40, dec: 0, fov: 40, proj: 'SIN' });
  const mid = interpolateView(from, to, 0.5);
  expect(mid.ra).toBeGreaterThan(20);
  expect(mid.ra).toBeLessThan(30);
  expect(mid.fov).toBeCloseTo(Math.sqrt(10 * 40), 5);
  expect(mid.proj).toBe('SIN');
});
