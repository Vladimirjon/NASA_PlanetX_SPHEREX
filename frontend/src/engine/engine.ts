import { updateRequests, type PendingRequest } from './core/tiles/request-policy';
import { evictions } from './core/tiles/lru';
import { pan, zoom } from './core/camera/camera';
import { selectOrder, pointAt, screenAt, visibleCells } from './core/tiles/selection';
import { browserClock } from './adapters/clock';
import { browserUrlState } from './adapters/url-state';
import type { Clock } from './ports/clock';
import type { UrlState } from './ports/url-state';
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
export interface EngineOptions { readonly tileSource?: TileSource; readonly renderer?: Renderer; readonly initialView?: Readonly<ViewState>; readonly cacheSize?: number; readonly capture?: boolean; readonly clock?: Clock; readonly urlState?: UrlState }
export interface SkyEngine {
  setView(view: Partial<ViewState>): void; getView(): Readonly<ViewState>; setPlane(plane: number): void;
  setProjection(projection: Projection): void; retry(): void; select(point: Point): void; screenPosition(point: Point): {x:number;y:number}|null; gridLabels(): {label:string;x:number;y:number}[]; on<K extends keyof Events>(event: K, handler: Listener<K>): () => void; destroy(): void;
}
export function createSkyEngine(canvas: HTMLCanvasElement, options: EngineOptions = {}): SkyEngine {
  const source = options.tileSource ?? irsaTileSource();
  const clockPort = options.clock ?? browserClock();
  const urlState = options.urlState ?? browserUrlState();
  const capacity = Math.max(12, options.cacheSize ?? 256);
  let renderer = options.renderer ?? createWebGL2Renderer(canvas, capacity, options.capture ?? false);
  let view: ViewState = { ...DEFAULT_VIEW, ...options.initialView }, destroyed = false, frame = 0, clock = 0;
  const cache = new Map<string, RecordState>();
  let pending = new Map<string, PendingRequest>();
  const attempted = new Set<string>();
  const failures = new Map<string,number>();
  const retryTimers = new Set<ReturnType<typeof setTimeout>>();
  let displayPlane=view.plane;
  let message='', networkError=false;
  const status=(next:string):void=>{if(next!==message){message=next;emit('status',next);}};
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  let selectionKey=''; let selected: ReturnType<typeof visibleCells>=[], expandedSelected: ReturnType<typeof visibleCells>=[];
  const listeners: { [K in keyof Events]: Set<Listener<K>> } = { viewchange: new Set(), pick: new Set(), cursor: new Set(), status: new Set() };
  const emit = <K extends keyof Events>(key: K, value: Events[K]): void => { listeners[key].forEach(listener => { listener(value); }); };
  function invalidate(): void { if (!destroyed && !frame) frame = clockPort.request(render); }
  function update(): void { if(urlTimer) clearTimeout(urlTimer); urlTimer=setTimeout(()=>{urlState.write(view);},250); emit('viewchange', { ...view }); invalidate(); }
  function render(): void {
    frame = 0; if (destroyed) return;
    if(view.plane===50 || view.plane===51) {
      status('This channel is blank by design: a dichroic transition has no data in DR1.');
      const ready: Tile[]=[]; for(const state of cache.values()) if(state.kind==='ready') ready.push(state.tile);
      renderer.render({...view,plane:displayPlane},ready);return;
    }
    const width=canvas.clientWidth,height=canvas.clientHeight,order=selectOrder(view.fov,width*devicePixelRatio);
    const key=`${view.ra}/${view.dec}/${view.fov}/${view.proj}/${width}/${height}`;
    if(key!==selectionKey){selectionKey=key;selected=visibleCells(view,width,height,order);expandedSelected=visibleCells({...view,fov:Math.min(360,view.fov*1.5)},width,height,order);}
    const wanted = new Map(selected.map(item => [`${item.order}/${item.npix}/${view.plane}`, item]));
    const expanded=new Set(expandedSelected.map(item=>`${item.order}/${item.npix}/${view.plane}`));
    const policy=updateRequests(pending,expanded,performance.now()); pending=policy.pending;
    for(const key of policy.abort) {const state=cache.get(key); if(state?.kind === 'loading') {state.controller.abort(); cache.delete(key);} }
    if (graceTimer) clearTimeout(graceTimer);
    if ([...pending.values()].some(item=>item.outsideSince!==null && item.order>2)) graceTimer=setTimeout(invalidate,410);
    let loading = [...cache.values()].filter(state => state.kind === 'loading').length;
    for (const [key, item] of [...wanted].sort((a,b) => b[1].order - a[1].order || a[1].distance - b[1].distance)) {
      const existing = cache.get(key);
      if(item.order<order && !existing) {
        let covered=false;
        for(let ancestor=0;ancestor<=item.order;ancestor++) if(cache.get(`${ancestor}/${Math.floor(item.npix/4**(item.order-ancestor))}/${view.plane}`)?.kind==='ready') {covered=true;break;}
        if(covered) continue;
      }
      if (existing?.kind === 'ready') { existing.used = ++clock; continue; }
      if (existing || attempted.has(key)) continue;
      if (loading >= 16) continue;
      loading++;
      const controller = new AbortController(); cache.set(key, { kind: 'loading', controller }); attempted.add(key); pending.set(key,{order:item.order,outsideSince:null});
      void source.fetch(item.order, item.npix, view.plane, controller.signal).then(bitmap => {
        pending.delete(key);
        if (destroyed || controller.signal.aborted) { bitmap.close(); return; }
        failures.delete(key); networkError=false;
        cache.set(key, { kind: 'ready', tile: { order: item.order, npix: item.npix, plane: Number(key.split('/')[2]), bitmap }, used: ++clock });
        const ready = [...cache.entries()].flatMap(([key,state]) => state.kind === 'ready' ? [{key,used:state.used}] : []);
        for (const oldKey of evictions(ready,capacity)) { const old=cache.get(oldKey); if(old?.kind === 'ready') old.tile.bitmap.close(); cache.delete(oldKey); attempted.delete(oldKey); }
        invalidate();
      }).catch((error: unknown) => {
        pending.delete(key); if (controller.signal.aborted || destroyed) return;
        const missing=error instanceof Error && error.message.includes('404'); if(!missing) networkError=true;
        const attempts=(failures.get(key) ?? 0)+1;failures.set(key,attempts);cache.set(key,{kind:'failed'});
        status(missing?'Some detailed images are unavailable; a coarser image may be shown.':"Can't reach IRSA right now. Cached areas remain visible.");
        if(!missing && attempts<3){const timer=setTimeout(()=>{retryTimers.delete(timer);if(!destroyed){cache.delete(key);attempted.delete(key);invalidate();}},500*2**(attempts-1));retryTimers.add(timer);}
        else {const timer=setTimeout(()=>{retryTimers.delete(timer);if(cache.get(key)?.kind==='failed')cache.delete(key);},30000);retryTimers.add(timer);}
        invalidate();
      });
    }
    const ready: Tile[]=[];let current=0,previous=0;
    for (const state of cache.values()) if(state.kind==='ready') {ready.push(state.tile);if(state.tile.plane===view.plane)current++;if(state.tile.plane===displayPlane)previous++;}
    if(current){if(displayPlane!==view.plane) displayPlane=view.plane; const active=[...pending.keys()].filter(key=>key.endsWith(`/${view.plane}`)).length; status(active ? `Loading sky images from IRSA… ${current} ready` : ''); renderer.render(view,ready);}
    else {status(networkError ? "Can't reach IRSA right now. Cached areas remain visible." : previous ? 'Loading the selected channel; the previous channel remains visible.' : 'Loading sky images from IRSA…');renderer.render({...view,plane:displayPlane},ready);}
  }
  const unbindInput = bindInput(canvas, {
    move(dx,dy) { view=pan(view,dx,dy,canvas.clientWidth);update(); },
    zoom(factor) { view=zoom(view,factor);update(); },
    band(delta) { view={...view,plane:Math.max(0,Math.min(101,view.plane+delta))};update(); },
    cursor(x,y) { emit('cursor',pointAt(view,x,y,canvas.clientWidth,canvas.clientHeight)); },
    pick(x,y) { const point=pointAt(view,x,y,canvas.clientWidth,canvas.clientHeight);if(point) emit('pick',{ra:Number(point.ra.toFixed(6)),dec:Number(point.dec.toFixed(6))}); },
  });
  const resize = new ResizeObserver(invalidate); resize.observe(canvas);
  const contextlost = (event: Event): void => { event.preventDefault(); status( 'WebGL context lost. Reload to restore the sky.'); };
  const contextrestored = (): void => {
    if (options.renderer) { status( 'WebGL context restored; external renderer must be recreated.'); return; }
    try { renderer.destroy(); for(const [key,state] of cache) if(state.kind==='ready'){cache.delete(key);attempted.delete(key);} renderer=createWebGL2Renderer(canvas,capacity,options.capture ?? false); status('WebGL context restored.'); invalidate(); }
    catch (error) { status(error instanceof Error ? error.message : 'WebGL restoration failed'); }
  };
  canvas.addEventListener('webglcontextlost', contextlost); canvas.addEventListener('webglcontextrestored',contextrestored);
  invalidate();
  return {
    setView(next) {
      const candidate={...view,...next};
      if (!Number.isFinite(candidate.ra) || candidate.ra < 0 || candidate.ra >= 360 || !Number.isFinite(candidate.dec) || candidate.dec < -90 || candidate.dec > 90 || !Number.isFinite(candidate.fov) || candidate.fov <= 0 || candidate.fov > 360 || !Number.isInteger(candidate.plane) || candidate.plane < 0 || candidate.plane > 101 || !['SIN','TAN','AIT'].includes(candidate.proj)) throw new RangeError('Invalid sky view');
      view=candidate; update();
    }, getView: () => ({...view}),
    setPlane(plane) { if (Number.isInteger(plane) && plane>=0 && plane<102) { view={...view,plane}; update(); } },
    setProjection(proj) { view={...view,proj}; update(); },
    select(point) {emit('pick',point);},
    screenPosition(point) {return screenAt(view,point.ra,point.dec,canvas.clientWidth,canvas.clientHeight);},
    gridLabels() {
      const spacing=view.fov>180?30:view.fov>45?15:view.fov>10?5:view.fov>2?1:view.fov>.5?.2:.05;
      const labels:{label:string;x:number;y:number}[]=[];
      for(let offset=-4;offset<=4;offset++) {
        const ra=((Math.round(view.ra/spacing)+offset)*spacing+360)%360;
        const dec=(Math.round(view.dec/spacing)+offset)*spacing;
        const a=screenAt(view,ra,view.dec,canvas.clientWidth,canvas.clientHeight);
        const d=dec>=-90&&dec<=90?screenAt(view,view.ra,dec,canvas.clientWidth,canvas.clientHeight):null;
        if(a&&a.x>0&&a.x<canvas.clientWidth&&a.y>0&&a.y<canvas.clientHeight)labels.push({label:`RA ${ra.toFixed(2)}°`,...a});
        if(d&&d.x>0&&d.x<canvas.clientWidth&&d.y>0&&d.y<canvas.clientHeight)labels.push({label:`Dec ${dec.toFixed(2)}°`,...d});
      }
      const filtered:{label:string;x:number;y:number}[]=[];
      for(const label of labels) {
        if(label.x+120>canvas.clientWidth || label.y+22>canvas.clientHeight)continue;
        if(filtered.some(other=>Math.abs(other.x-label.x)<120 && Math.abs(other.y-label.y)<26))continue;
        filtered.push(label); if(filtered.length===6)break;
      }
      return filtered;
    },
    retry() {networkError=false;for(const key of failures.keys()){cache.delete(key);attempted.delete(key);} failures.clear(); status('Loading sky images from IRSA…');invalidate();},
    on(key, listener) { listeners[key].add(listener); return () => listeners[key].delete(listener); },
    destroy() { destroyed=true; for(const timer of retryTimers) clearTimeout(timer); if(urlTimer) clearTimeout(urlTimer); if(graceTimer) clearTimeout(graceTimer); if(frame) clockPort.cancel(frame); resize.disconnect();
      unbindInput(); canvas.removeEventListener('webglcontextlost',contextlost); canvas.removeEventListener('webglcontextrestored',contextrestored);
      for (const state of cache.values()) { if (state.kind==='loading') state.controller.abort(); if (state.kind==='ready') state.tile.bitmap.close(); } renderer.destroy();
    },
  };
}

export { WAVELENGTHS } from './core/wavelengths';
export { coordinates } from './core/camera/coordinates';
export { parseTarget, TARGETS } from './core/camera/targets';
