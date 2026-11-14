import { afterEach, expect, it, vi } from 'vitest';
import { createSkyEngine } from '../src/engine/engine';
import type { Renderer } from '../src/engine/ports/renderer';
import type { TileSource } from '../src/engine/ports/tile-source';
import type { Clock } from '../src/engine/ports/clock';

function mockCanvas(): HTMLCanvasElement {
  const listeners = new Map<string, Set<EventListener>>();
  const canvas = {
    clientWidth: 800,
    clientHeight: 600,
    style: {},
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800, toJSON() { return {}; } }),
    setPointerCapture() { /* no-op */ },
    addEventListener(type: string, listener: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      const set = listeners.get(type);
      if (set) set.add(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
  };
  return canvas as unknown as HTMLCanvasElement;
}

function mockRenderer(): Renderer {
  return { render() { /* no-op */ }, destroy() { /* no-op */ } };
}

function mockSource(): TileSource {
  return {
    fetch() {
      return Promise.reject(new Error('404'));
    },
  };
}

function mockClock(): Clock & { flush: (now: number) => void } {
  const queue: { id: number; cb: FrameRequestCallback }[] = [];
  let nextId = 1;
  return {
    request(cb) {
      const id = nextId++;
      queue.push({ id, cb });
      return id;
    },
    cancel(id) {
      const index = queue.findIndex(item => item.id === id);
      if (index >= 0) queue.splice(index, 1);
    },
    flush(now) {
      const batch = queue.splice(0);
      for (const item of batch) item.cb(now);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it('flyTo arrives within tolerance and emits viewchange', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('ResizeObserver', class {
    observe() { /* no-op */ }
    disconnect() { /* no-op */ }
  });
  const clock = mockClock();
  const canvas = mockCanvas();
  const engine = createSkyEngine(canvas, {
    renderer: mockRenderer(),
    tileSource: mockSource(),
    clock,
    urlState: { write() { /* no-op */ } },
    initialView: { ra: 10, dec: 0, fov: 20, plane: 0, proj: 'SIN' },
  });
  const samples: number[] = [];
  engine.on('viewchange', view => { samples.push(view.ra); });
  const done = engine.flyTo({ ra: 40, dec: 5, fov: 5 }, { durationMs: 400 });
  const start = performance.now();
  clock.flush(start);
  clock.flush(start + 200);
  clock.flush(start + 400);
  clock.flush(start + 401);
  await done;
  const view = engine.getView();
  expect(view.ra).toBeCloseTo(40, 3);
  expect(view.dec).toBeCloseTo(5, 3);
  expect(view.fov).toBeCloseTo(5, 3);
  expect(samples.length).toBeGreaterThan(1);
  engine.destroy();
});

it('flyTo rejects when the user interrupts', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('ResizeObserver', class {
    observe() { /* no-op */ }
    disconnect() { /* no-op */ }
  });
  const clock = mockClock();
  const canvas = mockCanvas();
  const engine = createSkyEngine(canvas, {
    renderer: mockRenderer(),
    tileSource: mockSource(),
    clock,
    urlState: { write() { /* no-op */ } },
    initialView: { ra: 10, dec: 0, fov: 20, plane: 0, proj: 'SIN' },
  });
  const flight = engine.flyTo({ ra: 80, dec: 0, fov: 8 }, { durationMs: 1000 });
  clock.flush(performance.now());
  engine.zoomBy(0.9);
  await expect(flight).rejects.toThrow(/cancel/i);
  engine.destroy();
});
