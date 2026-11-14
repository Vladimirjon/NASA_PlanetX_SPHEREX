import { useEffect, useRef, useState } from 'react';
import { createSkyEngine, coordinates, parseTarget, TARGETS, WAVELENGTHS, type SkyEngine } from '../engine/engine';
import { DEFAULT_VIEW, parseViewState, type Projection, type ViewState } from '../engine/view-state';

const initial = parseViewState(window.location.search);
export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<SkyEngine | null>(null);
  const [view, setView] = useState<ViewState>(initial.view);
  const [cursor, setCursor] = useState<{ ra: number; dec: number } | null>(null);
  const [status, setStatus] = useState(initial.invalid ? 'This link had an invalid sky position, so the default hemisphere is shown.' : '');
  const [announcement, setAnnouncement] = useState('');
  const [target, setTarget] = useState('');
  const [projector, setProjector] = useState(false);
  const [tileSource, setTileSource] = useState('checking tile source');
  const [selected, setSelected] = useState<{ ra: number; dec: number } | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    let sky: SkyEngine;
    try {
      sky = createSkyEngine(canvas.current, {
        onTileSource: source => { setTileSource(source === 'backend' ? 'via SkyShift backend' : 'direct from IRSA'); },
        initialView: initial.view,
        capture: new URLSearchParams(window.location.search).has('capture'),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sky renderer unavailable');
      return;
    }
    engine.current = sky;
    let timer: ReturnType<typeof setTimeout>;
    let uiFrame = 0;
    let latest = initial.view;
    let latestCursor: { ra: number; dec: number } | null = null;
    const scheduleUi = (): void => {
      if (!uiFrame) {
        uiFrame = requestAnimationFrame(() => {
          uiFrame = 0;
          setView(latest);
          setCursor(latestCursor);
        });
      }
    };
    sky.on('viewchange', next => {
      latest = next;
      scheduleUi();
      clearTimeout(timer);
      timer = setTimeout(() => {
        setAnnouncement(`Center ${coordinates(next.ra, next.dec)}. Field of view ${next.fov.toFixed(2)} degrees. Channel ${next.plane + 1}, ${WAVELENGTHS[next.plane].toFixed(3)} micrometres.`);
      }, 400);
    });
    sky.on('cursor', next => { latestCursor = next; scheduleUi(); });
    sky.on('status', setStatus);
    sky.on('pick', p => {
      setSelected(p);
      setAnnouncement(`Selected ${coordinates(p.ra, p.dec)}`);
    });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(uiFrame);
      sky.destroy();
      engine.current = null;
    };
  }, []);
  const goTo = (): void => {
    const point = parseTarget(target);
    if (!point) {
      setStatus('Enter RA and Dec in degrees or sexagesimal, or select an object.');
      return;
    }
    void engine.current?.flyTo({ ...point, fov: 1 }, { durationMs: 700 }).then(
      () => { setStatus('Reference position selected; catalogue epochs vary.'); },
      () => { setStatus('Reference position selected; catalogue epochs vary.'); },
    );
  };
  return <main className="shell" data-theme={projector ? 'projector' : 'dark'}>
    <header>
      <div>
        <h1>SkyShift</h1>
        <span className="subtitle">Infrared images of the whole sky from NASA&apos;s SPHEREx (Data Release 1, via NASA/IPAC IRSA). Visualization only — brightness is not a measurement. Credits: NASA/JPL-Caltech/IPAC · released 2026-11-01</span>
      </div>
      <div className="observed">Observed 24 Apr 2025 – 14 May 2026 · SPHEREx DR1 all-sky coadd · {tileSource}</div>
    </header>
    <section className="viewer" aria-label="Interactive sky map">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - PageUp PageDown Enter"
        aria-label="Sky map. Drag to rotate the sky, use wheel or plus and minus to zoom, arrows to move, Page Up and Page Down to change channel."
      />
      {engine.current?.gridLabels().map((label, i) =>
        <span key={`${label.label}-${i}`} className="grid-label" style={{ left: label.x, top: label.y }}>{label.label}</span>)}
      {selected && engine.current?.screenPosition(selected) &&
        <span className="marker" style={{ left: engine.current.screenPosition(selected)?.x, top: engine.current.screenPosition(selected)?.y }} aria-hidden="true">＋</span>}
      {status && <div className="notice" role="status">{status} {status.includes('reach IRSA') && <button type="button" onClick={() => engine.current?.retry()}>Retry</button>}</div>}
      <div className="readout">
        <div><span>Center</span> {coordinates(view.ra, view.dec)}</div>
        <div><span>Cursor</span> {cursor ? coordinates(cursor.ra, cursor.dec) : 'Move pointer over sky'}</div>
      </div>
    </section>
    {selected && <div className="selection">Selected {coordinates(selected.ra, selected.dec)} <button type="button" onClick={() => engine.current?.select(selected)}>Open time series here</button><span> Time comparison coming soon.</span></div>}
    <footer>
      <div className="controls" role="group" aria-label="Sky navigation">
        <button type="button" onClick={() => engine.current?.zoomBy(1 / 1.4)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => engine.current?.zoomBy(1.4)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => engine.current?.setView(DEFAULT_VIEW)}>Reset view</button>
        <label>Go to <input list="sky-targets" value={target} onChange={e => { setTarget(e.target.value); }} placeholder="RA Dec or object" /></label>
        <datalist id="sky-targets">{TARGETS.map(t => <option key={t.name} value={t.name}>{t.epoch}</option>)}</datalist>
        <button type="button" onClick={goTo}>Go</button>
      </div>
      <label title="A micrometre (µm) is one thousandth of a millimetre; it describes infrared wavelength.">
        Channel
        <select value={view.plane} onChange={e => engine.current?.setPlane(Number(e.target.value))}>
          {WAVELENGTHS.map((w, i) =>
            <option key={i} value={i}>
              Infrared colour {w.toFixed(3)} µm · detector D{Math.floor(i / 17) + 1}, channel {i % 17 + 1}
              {i === 50 || i === 51 ? ' · blank by design (dichroic channel)' : ''}
            </option>)}
        </select>
      </label>
      <button type="button" aria-label="Previous channel" onClick={() => engine.current?.setPlane(Math.max(0, view.plane - 1))}>◀</button>
      <button type="button" aria-label="Next channel" onClick={() => engine.current?.setPlane(Math.min(101, view.plane + 1))}>▶</button>
      <label>Projection
        <select value={view.proj} onChange={e => engine.current?.setProjection(e.target.value as Projection)}>
          <option value="SIN">SIN (globe, max 180°)</option>
          <option value="TAN">TAN (max 90°)</option>
          <option value="AIT">AIT (all-sky)</option>
        </select>
      </label>
      <div>Field of view <strong className="num">{view.fov.toFixed(2)}°</strong>{view.proj === 'SIN' && view.fov >= 179.5 ? ' · one hemisphere' : ''}</div>
      <details>
        <summary>Keyboard shortcuts and image notes</summary>
        <p>Arrows move · + / − zoom · Page Up / Down changes channel · Enter selects center.</p>
        <p>Bright stars may have black cores from saturation or missing data; this is not a change.</p>
        <p>Planes 50 and 51 are blank by design: dichroic transition channels with no DR1 data.</p>
      </details>
      <button type="button" onClick={() => { setProjector(!projector); }} aria-pressed={projector}>Projector mode</button>
    </footer>
    <div className="sr-only" aria-live="polite">{announcement}</div>
  </main>;
}
