import { pan, zoom } from './core/camera/camera';
import { selectOrder, pointAt, visibleCells } from './core/tiles/selection';
import { bindInput } from './adapters/input';
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
    const wanted = new Map(visibleCells(view, canvas.clientWidth, canvas.clientHeight, selectOrder(view.fov, canvas.clientWidth * devicePixelRatio)).map(item => [`${item.order}/${item.npix}/${view.plane}`, item]));
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
  const unbindInput = bindInput(canvas, {
    move(dx,dy) { view=pan(view,dx,dy,canvas.clientWidth);update(); },
    zoom(factor) { view=zoom(view,factor);update(); },
    band(delta) { view={...view,plane:Math.max(0,Math.min(101,view.plane+delta))};update(); },
    cursor(x,y) { emit('cursor',pointAt(view,x,y,canvas.clientWidth,canvas.clientHeight)); },
    pick(x,y) { const point=pointAt(view,x,y,canvas.clientWidth,canvas.clientHeight);if(point) emit('pick',point); },
  });
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
      unbindInput(); canvas.removeEventListener('webglcontextlost',contextlost);
      for (const state of cache.values()) { if (state.kind==='loading') state.controller.abort(); if (state.kind==='ready') state.tile.bitmap.close(); } renderer.destroy();
    },
  };
}
