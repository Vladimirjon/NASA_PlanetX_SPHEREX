import { use, useEffect, useRef, useState, createContext, type ReactNode } from 'react';
import { CanvasSeriesRenderer, type ViewMode } from '../adapters/canvas-renderer';
import { DemoSeriesSource } from '../adapters/demo-source';
import { ApiSeriesSource, FallbackSeriesSource } from '../adapters/api-source';
import { BLINK_HZ_DEFAULT, blinkIntervalMs, clampBlinkHz, nextBlinkIndex, prevBlinkIndex } from '../core/blink';
import { COLOUR_LEGEND } from '../core/colour';
import {
  DIAGONAL_MASK_NOTE,
  describeExpectedMotion,
  describeTimeSpan,
  describeWavelength,
  formatVisitLabel,
  motionProvenanceLabel,
} from '../core/explain';
import { QUIET_LEGEND } from '../core/hidden';
import { seriesStretchLimits } from '../core/stretch';
import { parseSeriesSearch, toSeriesSearch, type SeriesQuery } from '../core/url';
import type { LoadedSeries, SeriesLookup } from '../ports/series-source';
import { SeriesSourceError } from '../ports/series-source';


type DemoObject = { slug: string; name: string };

type SeriesState = {
  loaded: LoadedSeries | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  frameIndex: number;
  playing: boolean;
  rateHz: number;
  mode: ViewMode;
  objects: DemoObject[];
  inspectOpen: boolean;
  pixelReadout: string | null;
  theme: 'auto' | 'light' | 'projector';
};

type SeriesActions = {
  loadLookup: (lookup: SeriesLookup) => void;
  setPlaying: (playing: boolean) => void;
  setRateHz: (hz: number) => void;
  setMode: (mode: ViewMode) => void;
  step: (dir: -1 | 1) => void;
  setTheme: (theme: SeriesState['theme']) => void;
  setInspectOpen: (open: boolean) => void;
  setPixelReadout: (text: string | null) => void;
  setFrameIndex: (index: number) => void;
};

type SeriesMeta = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

type Ctx = { state: SeriesState; actions: SeriesActions; meta: SeriesMeta };

const SeriesContext = createContext<Ctx | null>(null);

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function lookupFromQuery(q: SeriesQuery): SeriesLookup | null {
  if (q.kind === 'name') return { kind: 'name', name: q.name };
  if (q.kind === 'coords') return { kind: 'coords', ra: q.ra, dec: q.dec, fov: q.fov };
  return null;
}

function SeriesProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sourceRef = useRef(new FallbackSeriesSource(new ApiSeriesSource(), new DemoSeriesSource()));
  const demoRef = useRef(new DemoSeriesSource());

  const [state, setState] = useState<SeriesState>(() => {
    const reduced = prefersReducedMotion();
    return {
      loaded: null,
      status: 'idle',
      error: null,
      frameIndex: 0,
      playing: !reduced,
      rateHz: BLINK_HZ_DEFAULT,
      mode: reduced ? 'colour' : 'loop',
      objects: [],
      inspectOpen: false,
      pixelReadout: null,
      theme: 'auto',
    };
  });

  const loadLookupRef = useRef<(lookup: SeriesLookup) => void>(() => undefined);

  loadLookupRef.current = (lookup: SeriesLookup) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState(s => ({ ...s, status: 'loading', error: null }));
    void sourceRef.current
      .load(lookup, ac.signal)
      .then(loaded => {
        if (ac.signal.aborted) return;
        const reduced = prefersReducedMotion();
        setState(s => ({
          ...s,
          loaded,
          status: 'ready',
          frameIndex: 0,
          error: null,
          playing: reduced ? false : s.mode === 'loop',
          mode: reduced ? 'colour' : s.mode,
        }));
        const search =
          lookup.kind === 'name'
            ? toSeriesSearch({ kind: 'name', name: lookup.name })
            : toSeriesSearch({ kind: 'coords', ra: lookup.ra, dec: lookup.dec, fov: lookup.fov });
        if (window.location.search !== search) {
          window.history.replaceState(null, '', `${window.location.pathname}${search}`);
        }
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message =
          err instanceof SeriesSourceError
            ? err.detail ?? err.title
            : err instanceof Error
              ? err.message
              : 'Failed to load series';
        setState(s => ({ ...s, status: 'error', error: message, loaded: null, playing: false }));
      });
  };

  const loadLookup = (lookup: SeriesLookup) => {
    loadLookupRef.current(lookup);
  };

  useEffect(() => {
    void demoRef.current.listObjects().then(list => {
      setState(s => ({ ...s, objects: list.map(o => ({ slug: o.slug, name: o.name })) }));
    });
    const q = parseSeriesSearch(window.location.search);
    if (q.kind === 'invalid') {
      setState(s => ({ ...s, status: 'error', error: q.reason }));
      return;
    }
    const lookup = lookupFromQuery(q) ?? { kind: 'name' as const, name: 'barnards-star' };
    loadLookupRef.current(lookup);
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const seriesId = state.loaded?.series.series_id;
  useEffect(() => {
    if (!state.playing || state.mode !== 'loop' || !seriesId) return;
    const id = window.setInterval(() => {
      setState(s => ({
        ...s,
        frameIndex: nextBlinkIndex(s.frameIndex, s.loaded?.frames.length ?? 0),
      }));
    }, blinkIntervalMs(state.rateHz));
    return () => {
      window.clearInterval(id);
    };
  }, [state.playing, state.mode, state.rateHz, seriesId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setState(s => ({ ...s, playing: !s.playing, mode: s.mode === 'loop' ? s.mode : 'loop' }));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setState(s => ({
          ...s,
          playing: false,
          frameIndex: nextBlinkIndex(s.frameIndex, s.loaded?.frames.length ?? 0),
        }));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setState(s => ({
          ...s,
          playing: false,
          frameIndex: prevBlinkIndex(s.frameIndex, s.loaded?.frames.length ?? 0),
        }));
      } else if (e.key === 'b' || e.key === 'B') {
        setState(s => ({ ...s, mode: 'loop', playing: !prefersReducedMotion() }));
      } else if (e.key === 'd' || e.key === 'D') {
        setState(s => ({ ...s, mode: 'difference', playing: false }));
      } else if (e.key === 'c' || e.key === 'C') {
        setState(s => ({ ...s, mode: 'colour', playing: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  const actions: SeriesActions = {
    loadLookup,
    setPlaying: playing => { setState(s => ({ ...s, playing })); },
    setRateHz: hz => { setState(s => ({ ...s, rateHz: clampBlinkHz(hz) })); },
    setMode: mode => { setState(s => ({
        ...s,
        mode,
        playing: mode === 'loop' && !prefersReducedMotion(),
      })); },
    step: dir => { setState(s => ({
        ...s,
        playing: false,
        frameIndex:
          dir === 1
            ? nextBlinkIndex(s.frameIndex, s.loaded?.frames.length ?? 0)
            : prevBlinkIndex(s.frameIndex, s.loaded?.frames.length ?? 0),
      })); },
    setTheme: theme => { setState(s => ({ ...s, theme })); },
    setInspectOpen: inspectOpen => { setState(s => ({ ...s, inspectOpen })); },
    setPixelReadout: pixelReadout => { setState(s => ({ ...s, pixelReadout })); },
    setFrameIndex: frameIndex => { setState(s => ({ ...s, frameIndex })); },
  };

  return (
    <SeriesContext value={{ state, actions, meta: { canvasRef } }}>
      {children}
    </SeriesContext>
  );
}

function useSeries(): Ctx {
  const ctx = use(SeriesContext);
  if (!ctx) throw new Error('SeriesProvider missing');
  return ctx;
}

function StageCanvas() {
  const { state, actions, meta } = useSeries();
  const rendererRef = useRef<CanvasSeriesRenderer | null>(null);

  useEffect(() => {
    const canvas = meta.canvasRef.current;
    if (!canvas) return;
    rendererRef.current = new CanvasSeriesRenderer(canvas);
  }, [meta.canvasRef]);

  useEffect(() => {
    const loaded = state.loaded;
    const renderer = rendererRef.current;
    if (!loaded || !renderer) return;
    const [height, width] = loaded.series.grid.shape;
    const limits = seriesStretchLimits(loaded.series.frames.map(f => f.stats));
    const frame = loaded.series.frames[Math.min(state.frameIndex, loaded.series.frames.length - 1)];
    renderer.render({
      mode: state.mode,
      frameIndex: state.frameIndex,
      frames: loaded.frames,
      height,
      width,
      limits,
      grid: {
        shape: [height, width],
        crval_deg: [loaded.series.grid.crval_deg[0], loaded.series.grid.crval_deg[1]],
        pixel_scale_arcsec: loaded.series.grid.pixel_scale_arcsec,
      },
      predicted: frame.predicted_position ?? null,
      zoom: 6,
    });
  }, [state.loaded, state.frameIndex, state.mode]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const loaded = state.loaded;
    const canvas = meta.canvasRef.current;
    if (!loaded || !canvas) return;
    const [height, width] = loaded.series.grid.shape;
    const rect = canvas.getBoundingClientRect();
    const zx = canvas.width / width;
    const zy = canvas.height / height;
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width / zx);
    const yDisp = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height / zy);
    if (x < 0 || yDisp < 0 || x >= width || yDisp >= height) {
      actions.setPixelReadout(null);
      return;
    }
    const yFits = height - 1 - yDisp;
    const idx = yFits * width + x;
    const value = loaded.frames[state.frameIndex]?.[idx];
    const text = Number.isFinite(value)
      ? `pixel (${String(x)}, ${String(yFits)}) = ${value.toPrecision(4)} MJy/sr`
      : `pixel (${String(x)}, ${String(yFits)}) = masked (NaN)`;
    actions.setPixelReadout(text);
  };

  return (
    <canvas
      ref={meta.canvasRef}
      tabIndex={0}
      role="img"
      aria-label="SPHEREx time-series image stage"
      onMouseMove={onMove}
      onMouseLeave={() => { actions.setPixelReadout(null); }}
    />
  );
}

function HeaderBar() {
  const { state, actions } = useSeries();
  const [name, setName] = useState('');
  const [ra, setRa] = useState('');
  const [dec, setDec] = useState('');

  return (
    <header className="series-header">
      <div>
        <h1>SkyShift</h1>
        <div className="brand-sub">SPHEREx time series · infrared sky changes</div>
      </div>
      <div className="toolbar">
        <label>
          Object
          <select
            aria-label="Challenge object"
            value={state.loaded?.demoSlug ?? ''}
            onChange={e => {
              const slug = e.target.value;
              if (slug) actions.loadLookup({ kind: 'name', name: slug });
            }}
          >
            <option value="">Choose…</option>
            {state.objects.map(o => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            type="text"
            value={name}
            placeholder="Barnard's Star"
            aria-label="Object name"
            onChange={e => { setName(e.target.value); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) actions.loadLookup({ kind: 'name', name: name.trim() });
            }}
          />
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (name.trim()) actions.loadLookup({ kind: 'name', name: name.trim() });
          }}
        >
          Resolve
        </button>
        <label>
          RA
          <input
            type="number"
            inputMode="decimal"
            value={ra}
            aria-label="Right ascension degrees"
            onChange={e => { setRa(e.target.value); }}
          />
        </label>
        <label>
          Dec
          <input
            type="number"
            inputMode="decimal"
            value={dec}
            aria-label="Declination degrees"
            onChange={e => { setDec(e.target.value); }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const r = Number(ra);
            const d = Number(dec);
            if (Number.isFinite(r) && Number.isFinite(d)) {
              actions.loadLookup({ kind: 'coords', ra: r, dec: d, fov: 5 });
            }
          }}
        >
          Go
        </button>
        <label>
          Theme
          <select
            aria-label="Colour theme"
            value={state.theme}
            onChange={e => { actions.setTheme(e.target.value as SeriesState['theme']); }}
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="projector">Projector</option>
          </select>
        </label>
      </div>
    </header>
  );
}

function SidePanel() {
  const { state, actions } = useSeries();
  const loaded = state.loaded;
  if (!loaded) {
    return (
      <aside className="side">
        <h2>About this view</h2>
        <p className="muted">Load a challenge object to see real SPHEREx visits of one sky region.</p>
      </aside>
    );
  }
  const { series } = loaded;
  const level = series.comparability.level;
  const motion = describeExpectedMotion(series);
  const frame = series.frames[Math.min(state.frameIndex, series.frames.length - 1)];
  const limits = seriesStretchLimits(series.frames.map(f => f.stats));

  return (
    <aside className="side">
      {loaded.notice ? <div className="notice" role="status">{loaded.notice}</div> : null}

      <div>
        <h2>What you are looking at</h2>
        <p>{describeWavelength(series)}</p>
        <p>{describeTimeSpan(series.frames)}</p>
        {motion ? <p>{motion}</p> : null}
        <p className="muted">{QUIET_LEGEND}</p>
        <p className="muted">Blank diagonal edges: {DIAGONAL_MASK_NOTE}.</p>
        {state.mode === 'colour' ? <p className="ring-legend">{COLOUR_LEGEND}</p> : null}
        <p className="ring-legend">Ring: {motionProvenanceLabel(loaded.demoSlug)}</p>
      </div>

      <div>
        <span className="badge" data-level={level}>
          {level}
        </span>
        <p className="muted" style={{ marginTop: 8 }}>
          Software never assigns CONFIRMED. {level === 'OBSERVED'
            ? 'Images show an apparent difference.'
            : 'Difference persists after quality controls.'}
        </p>
      </div>

      <details className="panel">
        <summary>Comparability checks</summary>
        <ul className="check-list">
          {series.comparability.checks.map(c => (
            <li key={c.name}>
              <span className={c.passed ? 'pass' : 'fail'}>{c.passed ? 'PASS' : 'FAIL'}</span> {c.name}
              <div className="muted">{c.detail}</div>
            </li>
          ))}
        </ul>
      </details>

      <details className="panel">
        <summary>Rejected images ({String(series.rejected.length)})</summary>
        {series.rejected.length === 0 ? (
          <p className="muted">None rejected for this series.</p>
        ) : (
          <ul className="reject-list">
            {series.rejected.map(r => (
              <li key={r.obs_id}>
                <strong>{r.reason}</strong>
                <div className="muted">{r.obs_id}</div>
                <div>{r.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details
        className="panel"
        open={state.inspectOpen}
        onToggle={e => { actions.setInspectOpen((e.target as HTMLDetailsElement).open); }}
      >
        <summary>Inspect (expert)</summary>
        <p className="inspect-readout">{state.pixelReadout ?? 'Move cursor over the image for MJy/sr.'}</p>
        <p className="inspect-readout">
          Stretch (shared): lo={limits.lo.toPrecision(4)} hi={limits.hi.toPrecision(4)} MJy/sr (asinh)
        </p>
        <p className="inspect-readout">
          Grid: {String(series.grid.shape[0])}×{String(series.grid.shape[1])} TAN · {series.grid.pixel_scale_arcsec}″/px ·
          CRVAL {series.grid.crval_deg[0].toFixed(5)}, {series.grid.crval_deg[1].toFixed(5)}
        </p>
        <p className="inspect-readout">
          Frame λ={frame.wavelength_um.toFixed(5)} µm · detector D{String(frame.detector)} · unit {frame.unit}
        </p>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify(frame, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `frame-${String(frame.index)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download frame JSON
        </button>
      </details>
    </aside>
  );
}

function StageArea() {
  const { state, actions } = useSeries();
  const loaded = state.loaded;
  const frameCount = loaded?.frames.length ?? 0;
  const frame = loaded?.series.frames[Math.min(state.frameIndex, Math.max(frameCount - 1, 0))];
  const visitLabel =
    frame && frameCount > 0 ? formatVisitLabel(state.frameIndex, frameCount, frame.t_mid) : 'No visit loaded';

  const liveText = loaded
    ? `${visitLabel}. Mode ${state.mode}. ${state.playing ? 'Playing' : 'Paused'}. Level ${loaded.series.comparability.level}.`
    : state.status === 'loading'
      ? 'Loading series…'
      : state.error ?? 'Idle';

  return (
    <section className="stage-wrap">
      <div className="stage-meta">
        <div className="visit-label" data-testid="visit-label">
          {visitLabel}
        </div>
        <div className="muted">{state.mode === 'loop' ? 'Loop' : state.mode === 'difference' ? 'Difference' : 'Colour composite'}</div>
      </div>
      <div className="stage">
        {state.status === 'loading' ? <p className="status-line">Searching images…</p> : null}
        {state.status === 'error' ? <p className="status-line" role="alert">{state.error}</p> : null}
        {state.status === 'ready' ? <StageCanvas /> : null}
      </div>
      <div className="controls">
        <button type="button" className="primary" aria-pressed={state.playing} onClick={() => { actions.setPlaying(!state.playing); }} disabled={!loaded || state.mode !== 'loop'}>
          {state.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => { actions.step(-1); }} disabled={!loaded} aria-label="Previous frame">
          ←
        </button>
        <button type="button" onClick={() => { actions.step(1); }} disabled={!loaded} aria-label="Next frame">
          →
        </button>
        <label>
          Speed {state.rateHz.toFixed(1)} Hz
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={state.rateHz}
            aria-label="Blink speed in hertz"
            onChange={e => { actions.setRateHz(Number(e.target.value)); }}
          />
        </label>
        <div role="group" aria-label="View mode">
          <button type="button" aria-pressed={state.mode === 'loop'} onClick={() => { actions.setMode('loop'); }}>
            Loop
          </button>
          <button type="button" aria-pressed={state.mode === 'difference'} onClick={() => { actions.setMode('difference'); }}>
            Difference
          </button>
          <button type="button" aria-pressed={state.mode === 'colour'} onClick={() => { actions.setMode('colour'); }}>
            Colour composite
          </button>
        </div>
      </div>
      <div className="live" aria-live="polite">
        {liveText}
      </div>
    </section>
  );
}

function ProvenanceFooter() {
  const { state } = useSeries();
  const frame = state.loaded?.series.frames[state.frameIndex];
  return (
    <footer className="footer">
      <div className="prov-grid">
        {frame ? (
          <>
            <div>
              obs_id {frame.obs_id} · {frame.provenance.collection ?? 'collection n/a'} · {frame.t_mid.slice(0, 10)} · λ{' '}
              {frame.wavelength_um.toFixed(5)} µm · D{String(frame.detector)}
            </div>
            <div>
              <a href={frame.provenance.source_url} target="_blank" rel="noreferrer">
                IRSA access_url
              </a>
            </div>
          </>
        ) : (
          <div>No frame selected</div>
        )}
        <div>Data: NASA/JPL-Caltech/IPAC SPHEREx DR1 + QR3 via IRSA</div>
      </div>
    </footer>
  );
}

export function SeriesApp() {
  return (
    <SeriesProvider>
      <div className="series-app">
        <HeaderBar />
        <div className="main">
          <StageArea />
          <SidePanel />
        </div>
        <ProvenanceFooter />
      </div>
    </SeriesProvider>
  );
}
