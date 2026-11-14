import { useEffect, useRef, useState } from 'react';
import { createSkyEngine, coordinates, parseTarget, TARGETS, WAVELENGTHS, type SkyEngine } from '../engine/engine';
import { DEFAULT_VIEW, parseViewState, type Projection, type ViewState } from '../engine/view-state';

const initial = parseViewState(window.location.search);
export function App() {
  const canvas = useRef<HTMLCanvasElement>(null), engine = useRef<SkyEngine | null>(null);
  const [view,setView] = useState<ViewState>(initial.view);
  const [cursor,setCursor] = useState<{ra:number;dec:number}|null>(null);
  const [status,setStatus] = useState(initial.invalid ? 'Invalid URL state. Default view loaded.' : '');
  const [announcement,setAnnouncement] = useState('');
  const [target,setTarget] = useState('');
  const [projector,setProjector] = useState(false);
  const [selected,setSelected] = useState<{ra:number;dec:number}|null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    let sky: SkyEngine;
    try { sky = createSkyEngine(canvas.current, {initialView: initial.view,capture:new URLSearchParams(window.location.search).has('capture')}); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Sky renderer unavailable'); return; }
    engine.current = sky; let timer: ReturnType<typeof setTimeout>; let uiFrame=0; let latest=initial.view; let latestCursor:{ra:number;dec:number}|null=null;
    const scheduleUi=():void=>{if(!uiFrame)uiFrame=requestAnimationFrame(()=>{uiFrame=0;setView(latest);setCursor(latestCursor);});};
    sky.on('viewchange', next => { latest=next; scheduleUi(); clearTimeout(timer); timer=setTimeout(() => { setAnnouncement(`Center ${coordinates(next.ra,next.dec)}. Field of view ${next.fov.toFixed(2)} degrees. Channel ${next.plane+1}, ${WAVELENGTHS[next.plane].toFixed(3)} micrometres.`); }, 400); });
    sky.on('cursor', next=>{latestCursor=next;scheduleUi();}); sky.on('status', setStatus);
    sky.on('pick', p => { setSelected(p); setAnnouncement(`Selected ${coordinates(p.ra,p.dec)}`); });
    return () => { clearTimeout(timer); cancelAnimationFrame(uiFrame); sky.destroy(); engine.current = null; };
  }, []);
  return <main className="shell" data-theme={projector ? "projector" : "dark"}>
    <header><div><h1>SkyShift</h1><span className="subtitle">SPHEREx DR1 all-sky coadd · NASA/JPL-Caltech/IPAC · released 2026-11-01 · visualization only, not a time series</span></div><div className="observed">Observed 2025-04-24–2026-05-14 · asinh · uncertainty unavailable</div></header>
    <section className="viewer" aria-label="Interactive sky map">
      <canvas ref={canvas} tabIndex={0} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - PageUp PageDown Enter" aria-label="Sky map. Drag to pan, use wheel or plus and minus to zoom, arrows to move, Page Up and Page Down to change channel." />
      {engine.current?.gridLabels().map((label,i)=><span key={`${label.label}-${i}`} className="grid-label" style={{left:label.x,top:label.y}}>{label.label}</span>)}
      {selected && engine.current?.screenPosition(selected) && <span className="marker" style={{left:engine.current.screenPosition(selected)?.x,top:engine.current.screenPosition(selected)?.y}} aria-hidden="true">＋</span>}
      {status && <div className="notice" role="status">{status} {status.includes("reach IRSA") && <button type="button" onClick={()=>engine.current?.retry()}>Retry</button>}</div>}
      <div className="readout"><div><span>Center</span> {coordinates(view.ra,view.dec)}</div><div><span>Cursor</span> {cursor ? coordinates(cursor.ra,cursor.dec) : 'Move pointer over sky'}</div></div>
    </section>
    {selected && <div className="selection">Selected {coordinates(selected.ra,selected.dec)} <button type="button" onClick={()=>engine.current?.select(selected)}>Open time series here</button><span> Time comparison coming soon.</span></div>}
    <footer><div className="controls" role="group" aria-label="Sky navigation">
      <button type="button" onClick={() => engine.current?.setView({fov:Math.max(0.05,view.fov/1.4)})} aria-label="Zoom in">+</button>
      <button type="button" onClick={() => engine.current?.setView({fov:Math.min(360,view.fov*1.4)})} aria-label="Zoom out">−</button>
      <button type="button" onClick={() => engine.current?.setView(DEFAULT_VIEW)}>Reset view</button>
      <label>Go to <input list="sky-targets" value={target} onChange={e=> { setTarget(e.target.value); }} placeholder="RA Dec or object" /></label>
      <datalist id="sky-targets">{TARGETS.map(t=><option key={t.name} value={t.name}>{t.epoch}</option>)}</datalist>
      <button type="button" onClick={()=>{const point=parseTarget(target);if(point){engine.current?.setView({...point,fov:1});setStatus('Reference position selected; catalogue epochs vary.');}else setStatus('Enter RA and Dec in degrees or sexagesimal, or select an object.');}}>Go</button>
      </div><label title="A micrometre (µm) is one thousandth of a millimetre; it describes infrared wavelength.">Channel <select value={view.plane} onChange={e => engine.current?.setPlane(Number(e.target.value))}>{WAVELENGTHS.map((w,i) => <option key={i} value={i}>Infrared colour {w.toFixed(3)} µm · detector D{Math.floor(i/17)+1}, channel {i%17+1}{i===50 || i===51 ? ' · blank by design (dichroic channel)' : ''}</option>)}</select></label>
      <button type="button" aria-label="Previous channel" onClick={()=>engine.current?.setPlane(Math.max(0,view.plane-1))}>◀</button><button type="button" aria-label="Next channel" onClick={()=>engine.current?.setPlane(Math.min(101,view.plane+1))}>▶</button>
      <label>Projection <select value={view.proj} onChange={e => engine.current?.setProjection(e.target.value as Projection)}><option>SIN</option><option>TAN</option><option>AIT</option></select></label><div>Field of view <strong>{view.fov.toFixed(2)}°</strong>{view.proj === 'SIN' && view.fov > 180 && <span> · all-sky uses AIT</span>}</div><details><summary>Keyboard shortcuts and image notes</summary><p>Arrows move · + / − zoom · Page Up / Down changes channel · Enter selects center.</p><p>Bright stars may have black cores from saturation or missing data; this is not a change.</p></details><button type="button" onClick={()=> { setProjector(!projector); }} aria-pressed={projector}>Projector mode</button>
    </footer><div className="sr-only" aria-live="polite">{announcement}</div>
  </main>;
}
