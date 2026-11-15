import { parentCell } from './core/tiles/fallback';
import { motionOrder, updateRequests, type PendingRequest } from './core/tiles/request-policy';
import { neighbours } from './core/healpix/nested';
import { evictions } from './core/tiles/lru';
import { clampView, drag, interpolateView, pan, zoom, zoomAt } from './core/camera/camera';
import { selectOrder, pointAt, screenAt, visibleCells } from './core/tiles/selection';
import { browserClock } from './adapters/clock';
import { browserUrlState } from './adapters/url-state';
import type { Clock } from './ports/clock';
import type { UrlState } from './ports/url-state';
import { bindInput } from './adapters/input';
import { createWebGL2Renderer } from './adapters/webgl-renderer';
import { startupTileSource } from './adapters/tile-source';
import type { Renderer, Tile } from './ports/renderer';
import type { TileSource } from './ports/tile-source';
import { DEFAULT_VIEW, maxFov, type Projection, type ViewState } from './view-state';

type Point = { readonly ra: number; readonly dec: number };
type Events = { viewchange: ViewState; pick: Point; cursor: Point | null; status: string };
type Listener<K extends keyof Events> = (event: Events[K]) => void;
type RecordState = { kind: 'loading'; controller: AbortController } | { kind: 'ready'; tile: Tile; used: number } | { kind: 'failed'; missing: boolean };
export interface EngineOptions {
  readonly tileSource?: TileSource;
  readonly onTileSource?: (source: 'backend' | 'irsa') => void;
  readonly renderer?: Renderer;
  readonly initialView?: Readonly<ViewState>;
  readonly cacheSize?: number;
  readonly capture?: boolean;
  readonly clock?: Clock;
  readonly urlState?: UrlState;
}
export interface FlyToTarget { readonly ra: number; readonly dec: number; readonly fov: number }
export interface FlyToOptions { readonly durationMs?: number }
export interface SkyEngine {
  setView(view: Partial<ViewState>): void;
  getView(): Readonly<ViewState>;
  setPlane(plane: number): void;
  setProjection(projection: Projection): void;
  zoomBy(factor: number, anchor?: { x: number; y: number }): void;
  flyTo(target: FlyToTarget, options?: FlyToOptions): Promise<void>;
  retry(): void;
  select(point: Point): void;
  screenPosition(point: Point): { x: number; y: number } | null;
  gridLabels(): { label: string; x: number; y: number }[];
  on<K extends keyof Events>(event: K, handler: Listener<K>): () => void;
  destroy(): void;
}

const INERTIA_TAU_MS = 300;

export function createSkyEngine(canvas: HTMLCanvasElement, options: EngineOptions = {}): SkyEngine {
  const source = options.tileSource ?? startupTileSource(options.onTileSource);
  const clockPort = options.clock ?? browserClock();
  const urlState = options.urlState ?? browserUrlState();
  const capacity = Math.max(12, options.cacheSize ?? 256);
  let renderer = options.renderer ?? createWebGL2Renderer(canvas, capacity, options.capture ?? false);
  let view: ViewState = clampView({ ...DEFAULT_VIEW, ...options.initialView });
  let destroyed = false;
  let frame = 0;
  let clock = 0;
  const cache = new Map<string, RecordState>();
  let pending = new Map<string, PendingRequest>();
  const attempted = new Set<string>();
  const failures = new Map<string, number>();
  const retryTimers = new Set<ReturnType<typeof setTimeout>>();
  let displayPlane = view.plane;
  let message = '';
  let networkError = false;
  const status = (next: string): void => { if (next !== message) { message = next; emit('status', next); } };
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  let canvasWidth = canvas.clientWidth;
  let canvasHeight = canvas.clientHeight;
  let selectionKey = '';
  let selected: ReturnType<typeof visibleCells> = [];
  let expandedSelected: ReturnType<typeof visibleCells> = [];
  const listeners: { [K in keyof Events]: Set<Listener<K>> } = {
    viewchange: new Set(), pick: new Set(), cursor: new Set(), status: new Set(),
  };
  const emit = <K extends keyof Events>(key: K, value: Events[K]): void => {
    listeners[key].forEach(listener => { listener(value); });
  };
  let grabPoint: Point | null = null;
  let lastDrag: { x: number; y: number } | null = null;
  let moving = false;
  let movementOrder = 5;
  let destination: ViewState | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  function settle(): void {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { moving = false; destination = null; invalidate(); }, 150);
  }
  let inertiaFrame = 0;
  let inertia: { vx: number; vy: number; x: number; y: number; last: number } | null = null;
  let zoomFrame = 0;
  let zoomAnim: { targetFov: number; x: number; y: number; last: number } | null = null;
  const ZOOM_TAU_MS = 80;
  let flight: {
    from: ViewState;
    to: ViewState;
    start: number;
    duration: number;
    resolve: () => void;
    reject: (reason: Error) => void;
  } | null = null;
  const reducedMotion = (): boolean =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function invalidate(): void { if (!destroyed && !frame) frame = clockPort.request(render); }
  function scheduleUrl(delay = 250): void {
    if (urlTimer) clearTimeout(urlTimer);
    urlTimer = setTimeout(() => { urlState.write(view); }, delay);
  }
  function update(options: { readonly deferUrl?: boolean } = {}): void {
    // During inertia/zoom damping, keep the URL quiet until motion settles.
    if (!options.deferUrl) scheduleUrl(250);
    emit('viewchange', { ...view });
    invalidate();
  }
  function stopInertia(): void {
    inertia = null;
    if (inertiaFrame) { clockPort.cancel(inertiaFrame); inertiaFrame = 0; }
  }
  function stopZoom(): void {
    zoomAnim = null;
    if (zoomFrame) { clockPort.cancel(zoomFrame); zoomFrame = 0; }
  }
  function cancelFlight(reason = 'cancelled'): void {
    if (!flight) return;
    const active = flight;
    flight = null;
    destination = null;
    settle();
    active.reject(new Error(reason));
  }
  function interruptNavigation(): void {
    stopInertia();
    stopZoom();
    cancelFlight();
  }
  function tickZoom(now: number): void {
    zoomFrame = 0;
    if (!zoomAnim || destroyed) return;
    const dt = Math.min(64, Math.max(0, now - zoomAnim.last));
    zoomAnim.last = now;
    const alpha = 1 - Math.exp(-dt / ZOOM_TAU_MS);
    const nextFov = Math.exp(Math.log(view.fov) * (1 - alpha) + Math.log(zoomAnim.targetFov) * alpha);
    const factor = nextFov / view.fov;
    view = zoomAt(view, factor, zoomAnim.x, zoomAnim.y, canvasWidth, canvasHeight);
    update({ deferUrl: true });
    if (Math.abs(Math.log(view.fov / zoomAnim.targetFov)) < 1e-4) {
      stopZoom();
      scheduleUrl(0);
      return;
    }
    zoomFrame = clockPort.request(tickZoom);
  }
  function requestZoom(factor: number, x: number, y: number): void {
    stopInertia();
    cancelFlight();
    grabPoint = null;
    if (reducedMotion()) {
      stopZoom();
      view = zoomAt(view, factor, x, y, canvasWidth, canvasHeight);
      update();
      return;
    }
    const targetFov = Math.max(0.05, Math.min(maxFov(view.proj), (zoomAnim?.targetFov ?? view.fov) * factor));
    zoomAnim = { targetFov, x, y, last: zoomAnim?.last ?? performance.now() };
    if (!zoomFrame) zoomFrame = clockPort.request(tickZoom);
  }
  function tickInertia(now: number): void {
    inertiaFrame = 0;
    if (!inertia || destroyed) return;
    const dt = Math.min(64, Math.max(0, now - inertia.last));
    inertia.last = now;
    const decay = Math.exp(-dt / INERTIA_TAU_MS);
    const x1 = inertia.x + inertia.vx * dt;
    const y1 = inertia.y + inertia.vy * dt;
    view = drag(view, inertia.x, inertia.y, x1, y1, canvasWidth, canvasHeight);
    settle();
    inertia.x = Math.min(canvasWidth - 1, Math.max(0, x1));
    inertia.y = Math.min(canvasHeight - 1, Math.max(0, y1));
    inertia.vx *= decay;
    inertia.vy *= decay;
    update({ deferUrl: true });
    if (Math.hypot(inertia.vx, inertia.vy) < 0.02) {
      stopInertia();
      scheduleUrl(0);
      return;
    }
    inertiaFrame = clockPort.request(tickInertia);
  }
  function tickFlight(now: number): void {
    if (!flight || destroyed) return;
    const t = Math.max(0, Math.min(1, (now - flight.start) / flight.duration));
    const eased = t * t * (3 - 2 * t);
    view = interpolateView(flight.from, flight.to, eased);
    update({ deferUrl: true });
    if (t >= 1) {
      const done = flight;
      flight = null;
      settle();
      scheduleUrl(0);
      done.resolve();
      return;
    }
    clockPort.request(tickFlight);
  }

  function render(): void {
    frame = 0;
    if (destroyed) return;
    if (view.plane === 50 || view.plane === 51) {
      status('This channel is blank by design: a dichroic transition has no data in DR1. Any visible image belongs to the previous channel.');
      const ready: Tile[] = [];
      for (const state of cache.values()) if (state.kind === 'ready') ready.push(state.tile);
      renderer.render({ ...view, plane: displayPlane }, ready);
      return;
    }
    const width = canvasWidth;
    const height = canvasHeight;
    const pixels = width * (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    const order = motionOrder(selectOrder(view.fov, pixels), movementOrder, moving);
    const key = `${view.ra}/${view.dec}/${view.fov}/${view.proj}/${width}/${height}/${order}`;
    if (key !== selectionKey) {
      selectionKey = key;
      selected = visibleCells(view, width, height, order);
      expandedSelected = visibleCells({ ...view, fov: Math.min(maxFov(view.proj), view.fov * 2) }, width, height, order);
    }
    const wanted = new Map(selected.map(item => [`${item.order}/${item.npix}/${view.plane}`, item]));
    if (destination) {
      const destinationOrder = selectOrder(destination.fov, pixels);
      for (const item of visibleCells(destination, width, height, destinationOrder)) {
        wanted.set(`${item.order}/${item.npix}/${destination.plane}`, item);
      }
    }
    // Keep every ancestor until children arrive so zoom never flashes blank.
    for (const item of selected) {
      let candidate = item;
      for (;;) {
        const parent = parentCell(candidate);
        if (!parent) break;
        wanted.set(`${parent.order}/${parent.npix}/${view.plane}`, parent);
        candidate = parent;
      }
      candidate = item;
      while (cache.get(`${candidate.order}/${candidate.npix}/${view.plane}`)?.kind === 'failed') {
        const parent = parentCell(candidate);
        if (!parent) break;
        wanted.set(`${parent.order}/${parent.npix}/${view.plane}`, parent);
        candidate = parent;
      }
    }

    const expanded = new Set(expandedSelected.map(item => `${item.order}/${item.npix}/${view.plane}`));
    for (const key of wanted.keys()) expanded.add(key);
    for (const item of selected) for (const neighbour of neighbours(item.order, item.npix)) expanded.add(`${item.order}/${neighbour}/${view.plane}`);
    const policy = updateRequests(pending, expanded, performance.now());
    pending = policy.pending;
    for (const key of policy.abort) {
      const state = cache.get(key);
      if (state?.kind === 'loading') { state.controller.abort(); cache.delete(key); attempted.delete(key); }
    }
    if (graceTimer) clearTimeout(graceTimer);
    if ([...pending.values()].some(item => item.outsideSince !== null && item.order > 2)) graceTimer = setTimeout(invalidate, 510);
    let loading = [...cache.values()].filter(state => state.kind === 'loading').length;
    for (const [key, item] of [...wanted].sort((a, b) => b[1].order - a[1].order || a[1].distance - b[1].distance)) {
      const existing = cache.get(key);
      if (item.order < order && !existing) {
        let covered = false;
        for (let ancestor = 0; ancestor <= item.order; ancestor++) {
          if (cache.get(`${ancestor}/${Math.floor(item.npix / 4 ** (item.order - ancestor))}/${view.plane}`)?.kind === 'ready') {
            covered = true;
            break;
          }
        }
        if (covered) continue;
      }
      if (existing?.kind === 'ready') { existing.used = ++clock; continue; }
      if (existing || attempted.has(key)) continue;
      if (loading >= 16) continue;
      loading++;
      const controller = new AbortController();
      cache.set(key, { kind: 'loading', controller });
      attempted.add(key);
      pending.set(key, { order: item.order, outsideSince: null });
      void source.fetch(item.order, item.npix, view.plane, controller.signal).then(bitmap => {
        pending.delete(key);
        if (destroyed || controller.signal.aborted) { bitmap.close(); return; }
        failures.delete(key);
        networkError = [...cache.values()].some(state => state.kind === 'failed' && !state.missing);
        cache.set(key, {
          kind: 'ready',
          tile: { order: item.order, npix: item.npix, plane: Number(key.split('/')[2]), bitmap },
          used: ++clock,
        });
        const ready = [...cache.entries()].flatMap(([key, state]) => state.kind === 'ready' ? [{ key, used: state.used }] : []);
        for (const oldKey of evictions(ready, capacity)) {
          const old = cache.get(oldKey);
          if (old?.kind === 'ready') old.tile.bitmap.close();
          cache.delete(oldKey);
          attempted.delete(oldKey);
        }
        invalidate();
      }).catch((error: unknown) => {
        pending.delete(key);
        if (controller.signal.aborted || destroyed) return;
        const missing = error instanceof Error && error.message.includes('404');
        if (!missing) networkError = true;
        const attempts = (failures.get(key) ?? 0) + 1;
        failures.set(key, attempts);
        attempted.delete(key);
        cache.set(key, { kind: 'failed', missing });
        status(missing
          ? 'Some detailed images are unavailable; a coarser image may be shown.'
          : "Can't reach IRSA right now. Cached areas remain visible.");
        if (!missing && attempts < 3) {
          const timer = setTimeout(() => {
            retryTimers.delete(timer);
            if (!destroyed && cache.get(key)?.kind === 'failed' && failures.get(key) === attempts) {
              cache.delete(key);
              attempted.delete(key);
              invalidate();
            }
          }, 500 * 2 ** (attempts - 1));
          retryTimers.add(timer);
        }
        invalidate();
      });
    }
    const ready: Tile[] = [];
    let current = 0;
    let previous = 0;
    for (const state of cache.values()) {
      if (state.kind === 'ready') {
        ready.push(state.tile);
        if (state.tile.plane === view.plane) current++;
        if (state.tile.plane === displayPlane) previous++;
      }
    }
    const active = [...pending.keys()].filter(key => key.endsWith(`/${view.plane}`)).length;
    const outstanding = [...wanted.keys()].some(key => !cache.has(key) && !attempted.has(key));
    const switching = displayPlane !== view.plane;
    const missing = [...wanted.keys()].some(key => {
      const state = cache.get(key);
      return state?.kind === 'failed' && state.missing;
    });
    const retrying = [...failures.entries()].filter(([key, count]) => count < 3 && cache.get(key)?.kind === 'failed').length;
    status(retrying
      ? `IRSA busy — retrying ${String(retrying)} tiles`
      : networkError
      ? "Can't reach IRSA right now. Cached areas remain visible."
      : missing
        ? 'Some detailed images are unavailable; a coarser image may be shown.'
        : switching && previous
          ? 'Loading selected channel; previous channel remains visible where needed.'
          : active || outstanding
            ? `Loading sky images from IRSA… ${current} ready`
            : '');
    renderer.render(view, ready, switching ? displayPlane : undefined);
    if (switching && current > 0 && active === 0 && !outstanding) {
      displayPlane = view.plane;
      status('');
      invalidate();
    }
  }

  const unbindInput = bindInput(canvas, {
    grab(x, y) {
      stopInertia();
      moving = true;
      movementOrder = selectOrder(view.fov, canvasWidth * (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));
      if (settleTimer) clearTimeout(settleTimer);
      grabPoint = pointAt(view, x, y, canvasWidth, canvasHeight);
      lastDrag = { x, y };
    },
    dragTo(x, y) {
      stopInertia();
      if (grabPoint && lastDrag) {
        const { x: startX, y: startY } = lastDrag;
        const steps = Math.max(1, Math.ceil(Math.hypot(x - startX, y - startY) / 8));
        for (let step = 1; step <= steps; step++) {
          const from = (step - 1) / steps;
          const to = step / steps;
          view = drag(view, startX + (x - startX) * from, startY + (y - startY) * from,
            startX + (x - startX) * to, startY + (y - startY) * to, canvasWidth, canvasHeight);
        }
      }
      lastDrag = { x, y };
      update();
    },
    nudge(dx, dy) {
      stopInertia();
      grabPoint = null;
      view = pan(view, dx, dy, canvasWidth);
      update();
    },
    zoom(factor, x, y) {
      if (x !== undefined && y !== undefined) requestZoom(factor, x, y);
      else {
        stopZoom();
        grabPoint = null;
        view = zoom(view, factor);
        update();
      }
    },
    band(delta) {
      stopInertia();
      grabPoint = null;
      view = { ...view, plane: Math.max(0, Math.min(101, view.plane + delta)) };
      update();
    },
    cursor(x, y) { emit('cursor', pointAt(view, x, y, canvasWidth, canvasHeight)); },
    pick(x, y) {
      grabPoint = null;
      const point = pointAt(view, x, y, canvasWidth, canvasHeight);
      if (point) emit('pick', { ra: Number(point.ra.toFixed(6)), dec: Number(point.dec.toFixed(6)) });
    },
    release(vx, vy, x, y) {
      grabPoint = null;
      settle();
      if (reducedMotion() || Math.hypot(vx, vy) < 0.05) return;
      stopInertia();
      inertia = {
        vx,
        vy,
        x: Math.min(canvasWidth - 1, Math.max(0, x)),
        y: Math.min(canvasHeight - 1, Math.max(0, y)),
        last: performance.now(),
      };
      inertiaFrame = clockPort.request(tickInertia);
    },
    interrupt: interruptNavigation,
  });

  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      canvasWidth = entry.contentRect.width;
      canvasHeight = entry.contentRect.height;
    }
    invalidate();
  });
  resize.observe(canvas);
  const contextlost = (event: Event): void => {
    event.preventDefault();
    status('WebGL context lost. Reload to restore the sky.');
  };
  const contextrestored = (): void => {
    if (options.renderer) {
      status('WebGL context restored; external renderer must be recreated.');
      return;
    }
    try {
      renderer.destroy();
      for (const [key, state] of cache) if (state.kind === 'ready') { cache.delete(key); attempted.delete(key); }
      renderer = createWebGL2Renderer(canvas, capacity, options.capture ?? false);
      status('WebGL context restored.');
      invalidate();
    } catch (error) {
      status(error instanceof Error ? error.message : 'WebGL restoration failed');
    }
  };
  canvas.addEventListener('webglcontextlost', contextlost);
  canvas.addEventListener('webglcontextrestored', contextrestored);
  invalidate();

  return {
    setView(next) {
      interruptNavigation();
      const candidate = clampView({ ...view, ...next });
      if (!Number.isFinite(candidate.ra) || candidate.ra < 0 || candidate.ra >= 360
        || !Number.isFinite(candidate.dec) || candidate.dec < -90 || candidate.dec > 90
        || !Number.isFinite(candidate.fov) || candidate.fov <= 0 || candidate.fov > 360
        || !Number.isInteger(candidate.plane) || candidate.plane < 0 || candidate.plane > 101
        || !['SIN', 'TAN', 'AIT'].includes(candidate.proj)) {
        throw new RangeError('Invalid sky view');
      }
      view = candidate;
      update();
    },
    getView: () => ({ ...view }),
    setPlane(plane) {
      if (Number.isInteger(plane) && plane >= 0 && plane < 102) {
        interruptNavigation();
        view = { ...view, plane };
        update();
      }
    },
    setProjection(proj) {
      interruptNavigation();
      view = clampView({ ...view, proj });
      update();
    },
    zoomBy(factor, anchor) {
      if (anchor) requestZoom(factor, anchor.x, anchor.y);
      else {
        interruptNavigation();
        view = zoom(view, factor);
        update();
      }
    },
    flyTo(target, flyOptions = {}) {
      interruptNavigation();
      const duration = Math.max(0, flyOptions.durationMs ?? 800);
      const to = clampView({ ...view, ra: target.ra, dec: target.dec, fov: target.fov });
      const pixels = canvasWidth * (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
      moving = true;
      movementOrder = Math.min(selectOrder(view.fov, pixels), selectOrder(to.fov, pixels));
      destination = to;
      if (settleTimer) clearTimeout(settleTimer);
      invalidate();
      if (duration === 0 || reducedMotion()) {
        view = to;
        update();
        settle();
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        flight = { from: { ...view }, to, start: performance.now(), duration, resolve, reject };
        clockPort.request(tickFlight);
      });
    },
    select(point) { emit('pick', point); },
    screenPosition(point) { return screenAt(view, point.ra, point.dec, canvasWidth, canvasHeight); },
    gridLabels() {
      const spacing = view.fov > 90 ? 30 : view.fov > 45 ? 15 : view.fov > 10 ? 5 : view.fov > 2 ? 1 : view.fov > 0.5 ? 0.2 : 0.05;
      const labels: { label: string; x: number; y: number }[] = [];
      for (let offset = -4; offset <= 4; offset++) {
        const ra = ((Math.round(view.ra / spacing) + offset) * spacing + 360) % 360;
        const dec = (Math.round(view.dec / spacing) + offset) * spacing;
        const a = screenAt(view, ra, view.dec, canvasWidth, canvasHeight);
        const d = dec >= -90 && dec <= 90 ? screenAt(view, view.ra, dec, canvasWidth, canvasHeight) : null;
        if (a && a.x > 0 && a.x < canvasWidth && a.y > 0 && a.y < canvasHeight) labels.push({ label: `RA ${ra.toFixed(2)}°`, ...a });
        if (d && d.x > 0 && d.x < canvasWidth && d.y > 0 && d.y < canvasHeight) labels.push({ label: `Dec ${dec.toFixed(2)}°`, ...d });
      }
      const filtered: { label: string; x: number; y: number }[] = [];
      for (const label of labels) {
        if (label.x + 120 > canvasWidth || label.y + 22 > canvasHeight) continue;
        if (filtered.some(other => Math.abs(other.x - label.x) < 120 && Math.abs(other.y - label.y) < 26)) continue;
        filtered.push(label);
        if (filtered.length === 6) break;
      }
      return filtered;
    },
    retry() {
      networkError = false;
      for (const timer of retryTimers) clearTimeout(timer);
      retryTimers.clear();
      for (const key of failures.keys()) { cache.delete(key); attempted.delete(key); }
      failures.clear();
      status('Loading sky images from IRSA…');
      invalidate();
    },
    on(key, listener) {
      listeners[key].add(listener);
      return () => listeners[key].delete(listener);
    },
    destroy() {
      destroyed = true;
      interruptNavigation();
      for (const timer of retryTimers) clearTimeout(timer);
      if (urlTimer) clearTimeout(urlTimer);
      if (graceTimer) clearTimeout(graceTimer);
      if (settleTimer) clearTimeout(settleTimer);
      if (frame) clockPort.cancel(frame);
      resize.disconnect();
      unbindInput();
      canvas.removeEventListener('webglcontextlost', contextlost);
      canvas.removeEventListener('webglcontextrestored', contextrestored);
      for (const state of cache.values()) {
        if (state.kind === 'loading') state.controller.abort();
        if (state.kind === 'ready') state.tile.bitmap.close();
      }
      renderer.destroy();
    },
  };
}

export { WAVELENGTHS } from './core/wavelengths';
export { coordinates } from './core/camera/coordinates';
export { parseTarget, TARGETS } from './core/camera/targets';
export { maxFov } from './view-state';
