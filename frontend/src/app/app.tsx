import { useEffect, useRef, useState } from 'react';
import { createSkyEngine, WAVELENGTHS, type SkyEngine } from '../engine/engine';
import type { Projection } from '../engine/view-state';
import { ApiSeriesSource, FallbackSeriesSource } from '../series/adapters/api-source';
import { DemoSeriesSource } from '../series/adapters/demo-source';
import type { ViewMode } from '../series/adapters/canvas-renderer';
import { BLINK_HZ_DEFAULT, clampBlinkHz, nextBlinkIndex, prevBlinkIndex } from '../series/core/blink';
import type { LoadedSeries, SeriesLookup } from '../series/ports/series-source';
import { SeriesSourceError } from '../series/ports/series-source';
import { EngineMapController } from './adapters/engine-map-controller';
import { ChallengeRail } from './components/challenge-rail';
import { SearchBox } from './components/search-box';
import { SegmentedControl } from './components/segmented-control';
import { Slider } from './components/slider';
import { TimePanel } from './components/time-panel';
import { progressMessage } from './core/progress';
import { parseSearchQuery } from './core/search';
import { canonicalNameForSlug, targetBySlug } from './core/targets';
import { parseAppSearch, toAppSearch, type AppUrlState } from './core/url-state';

const ANALYZE_FOV_DEG = 0.5;
const FOV_ARCMIN = 5;
const EPSILON = 'epsilon-indi-b';
type SeriesView = 'regular' | 'recorded' | 'guided';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function detectorBandMarks(): { value: number; label: string }[] {
  // Approximate SPHEREx detector spans across 102 planes
  return [
    { value: 0, label: 'D1' },
    { value: 17, label: 'D2' },
    { value: 34, label: 'D3' },
    { value: 51, label: 'D4' },
    { value: 68, label: 'D5' },
    { value: 85, label: 'D6' },
  ];
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SkyEngine | null>(null);
  const mapRef = useRef<EngineMapController | null>(null);
  const demoSourceRef = useRef(new DemoSeriesSource());
  const navigationRef = useRef(0);
  const sourceRef = useRef(new FallbackSeriesSource(new ApiSeriesSource(), new DemoSeriesSource(), 60_000));
  const abortRef = useRef<AbortController | null>(null);
  const pickRef = useRef<{ ra: number; dec: number } | null>(null);

  const initial = parseAppSearch(window.location.search);
  const initialState: AppUrlState =
    initial.kind === 'invalid'
      ? { target: null, ra: null, dec: null, fov: 40, plane: 0, t: 0, mode: 'loop', proj: 'SIN' }
      : initial.state;

  const [theme, setTheme] = useState<'auto' | 'light' | 'projector'>('auto');
  const [plane, setPlane] = useState(initialState.plane);
  const [proj, setProj] = useState<Projection>(initialState.proj);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialState.target);
  const [panelOpen, setPanelOpen] = useState(Boolean(initialState.target || (initialState.ra !== null && initialState.dec !== null)));
  const [panelHeight, setPanelHeight] = useState(380);
  const [guidedHeight, setGuidedHeight] = useState(590);
  const [pick, setPick] = useState<{ ra: number; dec: number } | null>(null);
  const [statusLine, setStatusLine] = useState(
    initial.kind === 'invalid' ? initial.reason : '',
  );
  const [announce, setAnnounce] = useState('');
  const [tileSource, setTileSource] = useState('Checking tile source');

  const [seriesView, setSeriesView] = useState<SeriesView>(initialState.guidedPair ? 'guided' : 'regular');
  const [seriesStatus, setSeriesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedSeries | null>(null);
  const [frameIndex, setFrameIndex] = useState(initialState.t);
  const [playing, setPlaying] = useState(!prefersReducedMotion());
  const [rateHz, setRateHz] = useState(BLINK_HZ_DEFAULT);
  const [mode, setMode] = useState<ViewMode>(initialState.mode);
  const [lastLookup, setLastLookup] = useState<SeriesLookup | null>(null);

  // Mount sky engine
  useEffect(() => {
    if (!canvasRef.current) return;
    let sky: SkyEngine;
    try {
      sky = createSkyEngine(canvasRef.current, {
        onTileSource: source => { setTileSource(source === 'backend' ? 'via SkyShift backend' : 'direct from IRSA'); },
        initialView: {
          ra: initialState.ra ?? 180,
          dec: initialState.dec ?? -57.99,
          fov: initialState.fov,
          plane: initialState.plane,
          proj: initialState.proj,
        },
      });
    } catch (err) {
      setStatusLine(err instanceof Error ? err.message : 'Sky renderer unavailable');
      return;
    }
    engineRef.current = sky;
    mapRef.current = new EngineMapController(sky);
    sky.on('status', setStatusLine);
    sky.on('pick', p => {
      pickRef.current = p;
      setPick(p);
      setAnnounce(`Selected ${p.ra.toFixed(4)}°, ${p.dec.toFixed(4)}°`);
    });
    sky.on('viewchange', v => {
      setPlane(v.plane);
      setProj(v.proj);
    });
    return () => {
      mapRef.current?.destroy();
      sky.destroy();
      engineRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync URL
  useEffect(() => {
    const view = engineRef.current?.getView();
    const state: AppUrlState = {
      target: activeSlug,
      guidedPair: seriesView === 'guided',
      ra: view?.ra ?? pick?.ra ?? null,
      dec: view?.dec ?? pick?.dec ?? null,
      fov: view?.fov ?? 40,
      plane,
      t: frameIndex,
      mode,
      proj,
    };
    const next = toAppSearch(state);
    if (window.location.search !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${next}`);
    }
  }, [activeSlug, pick, plane, proj, frameIndex, mode, seriesView]);

  // Progress ticker while loading
  useEffect(() => {
    if (seriesStatus !== 'loading') return;
    if (seriesView !== 'regular') return;
    const start = performance.now();
    setProgress(progressMessage(0));
    const id = window.setInterval(() => {
      setProgress(progressMessage(performance.now() - start));
    }, 400);
    return () => {
      window.clearInterval(id);
    };
  }, [seriesStatus, seriesView]);

  // Keyboard: Space / arrows when panel open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, button, a, summary, [contenteditable]')) return;
      if (e.code === 'Space' && panelOpen && seriesStatus === 'ready') {
        e.preventDefault();
        setPlaying(p => !p);
        setMode('loop');
      } else if (e.code === 'ArrowRight' && panelOpen && loaded) {
        e.preventDefault();
        setPlaying(false);
        setFrameIndex(i => nextBlinkIndex(i, loaded.frames.length));
      } else if (e.code === 'ArrowLeft' && panelOpen && loaded) {
        e.preventDefault();
        setPlaying(false);
        setFrameIndex(i => prevBlinkIndex(i, loaded.frames.length));
      } else if (e.code === 'Enter' && !panelOpen) {
        const centre = engineRef.current?.getView();
        if (centre) {
          void analyzeCoords(centre.ra, centre.dec);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen, seriesStatus, loaded]);

  const loadSeries = (lookup: SeriesLookup, slug: string | null, view: SeriesView = 'regular') => {
    navigationRef.current += 1;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLastLookup(lookup);
    setSeriesView(view);
    if (view === 'guided') setMode('loop');
    setActiveSlug(slug);
    setPanelOpen(true);
    setSeriesStatus('loading');
    setError(null);
    setLoaded(null);
    setFrameIndex(0);
    setPlaying(false);
    setAnnounce(view === 'guided' ? 'Loading D3 comparison…' : 'Loading time series…');
    const request = view === 'guided'
      ? demoSourceRef.current.loadGuidedPair(ac.signal)
      : (view === 'recorded' ? demoSourceRef.current : sourceRef.current).load(lookup, ac.signal);
    void request
      .then(result => {
        if (ac.signal.aborted) return;
        setLoaded({ ...result, demoSlug: result.demoSlug ?? slug ?? undefined });
        setSeriesStatus('ready');
        setPlaying(view !== 'guided' && !prefersReducedMotion() && mode === 'loop');
        const n = result.series.frames.length;
        setAnnounce(
          n < 2
            ? `Loaded ${String(n)} visit. Not enough for a temporal comparison.`
            : `Loaded ${String(n)} visits. Time panel open.`,
        );
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message =
          view === 'guided'
            ? 'The D3 comparison could not be loaded.'
            : err instanceof SeriesSourceError
              ? err.detail ?? err.title
              : err instanceof Error
                ? err.message
                : 'Failed to load series';
        setSeriesStatus('error');
        setError(message);
        setAnnounce(message);
      });
  };

  const beginNavigation = (slug: string | null) => {
    abortRef.current?.abort();
    setLoaded(null);
    setSeriesStatus('idle');
    setSeriesView('regular');
    setActiveSlug(slug);
    return ++navigationRef.current;
  };

  const analyzeCoords = async (ra: number, dec: number) => {
    const navigation = beginNavigation(null);
    setPick({ ra, dec });
    await mapRef.current?.flyTo(
      { ra, dec, fov: ANALYZE_FOV_DEG },
      { reducedMotion: prefersReducedMotion() },
    );
    if (navigation === navigationRef.current) loadSeries({ kind: 'coords', ra, dec, fov: FOV_ARCMIN }, null);
  };

  const selectTarget = async (slug: string, view: SeriesView = 'regular') => {
    const target = targetBySlug(slug);
    const canonical = canonicalNameForSlug(slug);
    if (!target || !canonical) return;
    const navigation = beginNavigation(slug);
    setPick({ ra: target.ra, dec: target.dec });
    setAnnounce(`Flying to ${target.name}`);
    await mapRef.current?.flyTo(
      { ra: target.ra, dec: target.dec, fov: ANALYZE_FOV_DEG },
      { reducedMotion: prefersReducedMotion() },
    );
    // Always resolve by canonical name — never send the slug to /resolve.
    if (navigation === navigationRef.current) loadSeries({ kind: 'name', name: canonical }, slug, view);
  };

  const onSubmitQuery = (raw: string) => {
    const q = parseSearchQuery(raw);
    if (q.kind === 'target') {
      void selectTarget(q.slug);
    } else if (q.kind === 'coords') {
      void analyzeCoords(q.ra, q.dec);
    } else if (q.kind === 'name') {
      const navigation = beginNavigation(null);
      void (async () => {
        await mapRef.current?.flyTo(
          engineRef.current?.getView() ?? { ra: 180, dec: 0, fov: ANALYZE_FOV_DEG },
          { durationMs: 0 },
        );
        if (navigation === navigationRef.current) loadSeries({ kind: 'name', name: q.name }, null);
      })();
    } else if (q.kind === 'invalid') {
      setStatusLine(q.reason);
    }
  };

  // Bootstrap from URL once the engine is ready
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    if (!engineRef.current && !initialState.guidedPair) return;
    bootstrapped.current = true;
    if (initialState.target) {
      void selectTarget(initialState.target, initialState.guidedPair ? 'guided' : 'regular');
    } else if (initialState.ra !== null && initialState.dec !== null) {
      void analyzeCoords(initialState.ra, initialState.dec);
    }
  });

  const lambda = WAVELENGTHS[plane] ?? WAVELENGTHS[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>SkyShift</strong>
          <span className="brand-sub">SPHEREx DR1 · IRSA · {tileSource}</span>
        </div>
        <SearchBox onSubmitQuery={onSubmitQuery} onPickTarget={slug => { void selectTarget(slug); }} />
        <SegmentedControl
          label="Theme"
          value={theme}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'projector', label: 'Projector' },
          ]}
          onChange={setTheme}
        />
      </header>

      <div className="workspace">
        <ChallengeRail activeSlug={activeSlug} onSelect={slug => { void selectTarget(slug); }} />

        <section className="map-area" aria-label="Sky map">
          <canvas
            ref={canvasRef}
            className="sky-canvas"
            tabIndex={0}
            aria-label="Sky map. Drag to pan, scroll to zoom, click to pick a region, Enter to analyze centre."
            data-testid="sky-map"
          />
          {statusLine ? (
            <p className="map-notice" role="status">
              {statusLine}
            </p>
          ) : null}
          <div className="map-tools">
            <Slider
              label="Band"
              value={plane}
              min={0}
              max={101}
              step={1}
              readout={`${lambda.toFixed(3)} µm · plane ${String(plane)}`}
              marks={detectorBandMarks()}
              onChange={v => {
                setPlane(v);
                engineRef.current?.setPlane(v);
              }}
            />
            <SegmentedControl
              label="Projection"
              value={proj}
              options={[
                { value: 'SIN', label: 'SIN' },
                { value: 'TAN', label: 'TAN' },
                { value: 'AIT', label: 'AIT' },
              ]}
              onChange={p => {
                setProj(p);
                engineRef.current?.setProjection(p);
              }}
            />
          </div>
          {pick ? (
            <button
              type="button"
              className="fab primary"
              data-testid="analyze-region"
              onClick={() => {
                void analyzeCoords(pick.ra, pick.dec);
              }}
            >
              Analyze this region
            </button>
          ) : null}
        </section>
      </div>

      <TimePanel
        open={panelOpen}
        height={seriesView === 'guided' ? guidedHeight : panelHeight}
        onResize={seriesView === 'guided' ? setGuidedHeight : setPanelHeight}
        onClose={() => {
          setPanelOpen(false);
          setPlaying(false);
        }}
        status={seriesStatus}
        progress={seriesView === 'guided' ? 'Loading D3 comparison…' : seriesView === 'recorded' ? 'Loading recorded time series…' : progress}
        guidedPairOpen={seriesView === 'guided'}
        onOpenGuidedPair={activeSlug === EPSILON ? () => { loadSeries({ kind: 'name', name: 'Epsilon Indi B' }, EPSILON, 'guided'); } : undefined}
        onReturnToSeries={() => { loadSeries({ kind: 'name', name: 'Epsilon Indi B' }, EPSILON, 'recorded'); }}
        error={error}
        onRetry={() => {
          if (lastLookup) loadSeries(lastLookup, activeSlug, seriesView);
        }}
        loaded={loaded}
        frameIndex={frameIndex}
        setFrameIndex={setFrameIndex}
        playing={playing}
        setPlaying={setPlaying}
        rateHz={rateHz}
        setRateHz={hz => {
          setRateHz(clampBlinkHz(hz));
        }}
        mode={mode}
        setMode={setMode}
        targetSlug={activeSlug}
      />

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
