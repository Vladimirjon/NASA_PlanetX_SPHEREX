import { ang2pix } from './core/healpix/nested';
import { pan, zoom } from './core/camera/camera';
import { selectOrder } from './core/tiles/selection';
import { unproject } from './core/projections/math';
import { createWebGL2Renderer } from './adapters/webgl-renderer';
import { irsaTileSource } from './adapters/tile-source';
import type { Renderer, Tile } from './ports/renderer';
import type { TileSource } from './ports/tile-source';
import { DEFAULT_VIEW, type Projection, type ViewState } from './view-state';

type Point = { readonly ra: number; readonly dec: number };
type Events = { viewchange: ViewState; pick: Point; cursor: Point | null; status: string };
type Listener<K extends keyof Events> = (event: Events[K]) => void;
type RecordState = { kind: 'loading'; controller: AbortController } | { kind: 'ready'; tile: Tile; used: number } | { kind: 'failed' };
export interface EngineOptions { readonly tileSource?: TileSource; readonly renderer?: Renderer; readonly initialView?: Readonly<ViewState>; readonly cacheSize?: number }
export interface SkyEngine {
  setView(view: Partial<ViewState>): void; getView(): Readonly<ViewState>; setPlane(plane: number): void;
  setProjection(projection: Projection): void; on<K extends keyof Events>(event: K, handler: Listener<K>): () => void; destroy(): void;
}
function pointAt(view: Readonly<ViewState>, x: number, y: number, width: number, height: number): Point | null {
  const projection = view.proj === 'SIN' && view.fov > 180 ? 'AIT' : view.proj;
  const fov = view.fov * Math.PI / 180;
  const scale = projection === 'SIN' ? Math.sin(Math.min(fov, Math.PI) / 2) : projection === 'TAN' ? Math.tan(Math.min(fov, 2.6) / 2) : 2 * Math.SQRT2 * Math.min(fov / (2 * Math.PI), 1);
  return unproject(projection, (2 * x / width - 1) * scale, (1 - 2 * y / height) * scale * height / width, view.ra, view.dec);
}
export function createSkyEngine(canvas: HTMLCanvasElement, options: EngineOptions = {}): SkyEngine {
  const source = options.tileSource ?? irsaTileSource();
  const renderer = options.renderer ?? createWebGL2Renderer(canvas, options.cacheSize ?? 256);
  const capacity = Math.max(12, options.cacheSize ?? 256);
  let view: ViewState = { ...DEFAULT_VIEW, ...options.initialView }, destroyed = false, frame = 0, clock = 0;
  const cache = new Map<string, RecordState>();
  const listeners: { [K in keyof Events]: Set<Listener<K>> } = { viewchange: new Set(), pick: new Set(), cursor: new Set(), status: new Set() };
  const emit = <K extends keyof Events>(key: K, value: Events[K]): void => { listeners[key].forEach(listener => { listener(value); }); };
  function invalidate(): void { if (!destroyed && !frame) frame = requestAnimationFrame(render); }
  function update(): void { emit('viewchange', { ...view }); invalidate(); }
  function render(): void {
    frame = 0; if (destroyed) return;
    const wanted = new Map<string, { order: number; npix: number; distance: number }>();
    const order = selectOrder(view.fov, canvas.clientWidth * devicePixelRatio);
    for (let pixel = 0; pixel < 12; pixel++) wanted.set(`0/${pixel}/${view.plane}`, { order: 0, npix: pixel, distance: 1e9 });
    const width = canvas.clientWidth, height = canvas.clientHeight;
    for (let y = 0; y <= height; y += Math.max(1, height / 20)) for (let x = 0; x <= width; x += Math.max(1, width / 20)) {
      const point = pointAt(view, x, y, width, height); if (!point) continue;
      for (let level = 1; level <= order; level++) {
        const npix = ang2pix(level, point.ra, point.dec), key = `${level}/${npix}/${view.plane}`;
        const distance = (x-width/2)**2 + (y-height/2)**2;
        if (!wanted.has(key) || distance < (wanted.get(key)?.distance ?? Infinity)) wanted.set(key, { order: level, npix, distance });
      }
    }
    for (const [key, state] of cache) if (state.kind === 'loading' && !wanted.has(key)) { state.controller.abort(); cache.delete(key); }
    for (const [key, item] of [...wanted].sort((a,b) => a[1].order - b[1].order || a[1].distance - b[1].distance)) {
      const existing = cache.get(key);
      if (existing?.kind === 'ready') { existing.used = ++clock; continue; }
      if (existing) continue;
      const controller = new AbortController(); cache.set(key, { kind: 'loading', controller });
      void source.fetch(item.order, item.npix, view.plane, controller.signal).then(bitmap => {
        if (destroyed || controller.signal.aborted) { bitmap.close(); return; }
        cache.set(key, { kind: 'ready', tile: { order: item.order, npix: item.npix, bitmap }, used: ++clock });
        const ready = [...cache.entries()].filter((entry): entry is [string, Extract<RecordState, {kind: 'ready'}>] => entry[1].kind === 'ready').sort((a,b) => a[1].used - b[1].used);
        while (ready.length > capacity) { const oldest = ready.shift(); if (oldest) { oldest[1].tile.bitmap.close(); cache.delete(oldest[0]); } }
        invalidate();
      }).catch((error: unknown) => { if (controller.signal.aborted || destroyed) return; cache.set(key, { kind: 'failed' }); emit('status', `Some tiles are unavailable: ${error instanceof Error ? error.message : 'network error'}`); invalidate(); });
    }
    const tiles: Tile[] = [];
    for (const [key, state] of cache) if (state.kind === 'ready' && key.endsWith(`/${view.plane}`)) tiles.push(state.tile);
    renderer.render(view, tiles);
  }
  let dragging: { x: number; y: number; moved: boolean } | null = null;
  const pointerdown = (event: PointerEvent): void => { canvas.setPointerCapture(event.pointerId); dragging = { x: event.clientX, y: event.clientY, moved: false }; };
  const pointermove = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect(); emit('cursor', pointAt(view, event.clientX-rect.left, event.clientY-rect.top, rect.width, rect.height));
    if (dragging) { const dx = event.clientX-dragging.x, dy = event.clientY-dragging.y; dragging = { x: event.clientX, y: event.clientY, moved: dragging.moved || Math.abs(dx)+Math.abs(dy)>1 }; view = pan(view, dx, dy, rect.width); update(); }
  };
  const pointerup = (event: PointerEvent): void => { if (dragging && !dragging.moved) { const rect = canvas.getBoundingClientRect(); const p = pointAt(view, event.clientX-rect.left, event.clientY-rect.top, rect.width, rect.height); if (p) emit('pick', p); } dragging = null; };
  const wheel = (event: WheelEvent): void => { event.preventDefault(); view = zoom(view, Math.exp(event.deltaY * 0.001)); update(); };
  const keydown = (event: KeyboardEvent): void => {
    const step = 30; let handled = true;
    switch (event.key) {
      case 'ArrowLeft': view=pan(view,-step,0,canvas.clientWidth); break;
      case 'ArrowRight': view=pan(view,step,0,canvas.clientWidth); break;
      case 'ArrowUp': view=pan(view,0,-step,canvas.clientWidth); break;
      case 'ArrowDown': view=pan(view,0,step,canvas.clientWidth); break;
      case '+': case '=': view=zoom(view,0.8); break;
      case '-': view=zoom(view,1.25); break;
      case 'PageUp': view={...view,plane:Math.min(101,view.plane+1)}; break;
      case 'PageDown': view={...view,plane:Math.max(0,view.plane-1)}; break;
      default: handled=false;
    }
    if (handled) { event.preventDefault(); update(); }
  };
  canvas.addEventListener('pointerdown', pointerdown); canvas.addEventListener('pointermove', pointermove); canvas.addEventListener('pointerup', pointerup);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', keydown);
  const resize = new ResizeObserver(invalidate); resize.observe(canvas);
  const contextlost = (event: Event): void => { event.preventDefault(); emit('status', 'WebGL context lost. Reload to restore the sky.'); };
  canvas.addEventListener('webglcontextlost', contextlost);
  invalidate();
  return {
    setView(next) { view={...view,...next}; update(); }, getView: () => ({...view}),
    setPlane(plane) { if (Number.isInteger(plane) && plane>=0 && plane<102) { view={...view,plane}; update(); } },
    setProjection(proj) { view={...view,proj}; update(); },
    on(key, listener) { listeners[key].add(listener); return () => listeners[key].delete(listener); },
    destroy() { destroyed=true; if(frame) cancelAnimationFrame(frame); resize.disconnect();
      canvas.removeEventListener('pointerdown',pointerdown); canvas.removeEventListener('pointermove',pointermove); canvas.removeEventListener('pointerup',pointerup); canvas.removeEventListener('wheel',wheel); canvas.removeEventListener('keydown',keydown); canvas.removeEventListener('webglcontextlost',contextlost);
      for (const state of cache.values()) { if (state.kind==='loading') state.controller.abort(); if (state.kind==='ready') state.tile.bitmap.close(); } renderer.destroy();
    },
  };
}
