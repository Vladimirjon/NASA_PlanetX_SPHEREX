import { useEffect, useRef, useState } from 'react';
import { createSkyEngine, coordinates, WAVELENGTHS, type SkyEngine } from '../engine/engine';
import { parseViewState, type Projection, type ViewState } from '../engine/view-state';

const initial = parseViewState(window.location.search);
export function App() {
  const canvas = useRef<HTMLCanvasElement>(null), engine = useRef<SkyEngine | null>(null);
  const [view,setView] = useState<ViewState>(initial.view);
  const [cursor,setCursor] = useState<{ra:number;dec:number}|null>(null);
  const [status,setStatus] = useState(initial.invalid ? 'Invalid URL state. Default view loaded.' : '');
  const [announcement,setAnnouncement] = useState('');
  useEffect(() => {
    if (!canvas.current) return;
    let sky: SkyEngine;
    try { sky = createSkyEngine(canvas.current, {initialView: initial.view}); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Sky renderer unavailable'); return; }
    engine.current = sky; let timer: ReturnType<typeof setTimeout>;
    sky.on('viewchange', next => { setView(next); clearTimeout(timer); timer=setTimeout(() => { setAnnouncement(`Center ${coordinates(next.ra,next.dec)}`); }, 400); });
    sky.on('cursor', setCursor); sky.on('status', setStatus);
    sky.on('pick', p => { setAnnouncement(`Selected ${coordinates(p.ra,p.dec)}`); });
    return () => { clearTimeout(timer); sky.destroy(); engine.current = null; };
  }, []);
  return <main className="shell">
    <header><div><strong>SkyShift</strong><span className="subtitle">SPHEREx DR1 HiPS · IRSA · visualization only</span></div><div className="observed">2025-04-24–2026-05-14 · asinh · uncertainty unavailable</div></header>
    <section className="viewer" aria-label="Interactive sky map">
      <canvas ref={canvas} tabIndex={0} aria-label="Sky map. Drag to pan, use wheel or plus and minus to zoom, arrows to move, Page Up and Page Down to change band." />
      {status && <p className="notice" role="status">{status}</p>}
      <div className="readout"><div><span>Center</span> {coordinates(view.ra,view.dec)}</div><div><span>Cursor</span> {cursor ? coordinates(cursor.ra,cursor.dec) : 'Move pointer over sky'}</div></div>
    </section>
    <footer><label>Band <select value={view.plane} onChange={e => engine.current?.setPlane(Number(e.target.value))}>{WAVELENGTHS.map((w,i) => <option key={i} value={i}>{i} · {w.toFixed(3)} µm{i===50 || i===51 ? ' · blank' : ''}</option>)}</select></label>
      <label>Projection <select value={view.proj} onChange={e => engine.current?.setProjection(e.target.value as Projection)}><option>SIN</option><option>TAN</option><option>AIT</option></select></label><div>Field of view <strong>{view.fov.toFixed(2)}°</strong>{view.proj === 'SIN' && view.fov > 180 && <span> · all-sky uses AIT</span>}</div><span className="help">Drag to move · scroll to zoom</span>
    </footer><div className="sr-only" aria-live="polite">{announcement}</div>
  </main>;
}
