import { useEffect, useRef, useState } from 'react';
import { EngineMapController } from '../../src/app/adapters/engine-map-controller';
import { parseSearchQuery } from '../../src/app/core/search';
import { buildTimeline } from '../../src/app/core/timeline';
import { canonicalNameForSlug, CHALLENGE_TARGETS, targetBySlug } from '../../src/app/core/targets';
import { parseAppSearch, toAppSearch, type AppUrlState, type Projection, type ViewMode } from '../../src/app/core/url-state';
import { createSkyEngine, type SkyEngine } from '../../src/engine/engine';
import { ApiSeriesSource, FallbackSeriesSource } from '../../src/series/adapters/api-source';
import { DemoSeriesSource } from '../../src/series/adapters/demo-source';
import { BLINK_HZ_DEFAULT, blinkIntervalMs, nextBlinkIndex, prevBlinkIndex } from '../../src/series/core/blink';
import type { LoadedSeries, SeriesLookup } from '../../src/series/ports/series-source';
import { SeriesSourceError } from '../../src/series/ports/series-source';
import { BandBars } from './components/BandBars';
import { SeriesCutout } from './components/SeriesCutout';
import { Tip } from './components/Tip';
import {
  describeExpectedMotionI18n,
  describeTimeSpanI18n,
  describeWavelengthI18n,
  formatVisitLabelI18n,
  localizeEngineStatus,
  motionProvenanceI18n,
} from './explain-i18n';
import { detectLang, persistLang, seriesProgressMessage, t, type Lang } from './i18n';

const ANALYZE_FOV_DEG = 0.5;
const FOV_ARCMIN = 5;
const DEFAULT_TARGET = 'wise-0855';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function mapOffFromSearch(search: string): boolean {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q).get('map') === 'off';
}

function useIsMobile(breakpoint = 820): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${String(breakpoint)}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${String(breakpoint)}px)`);
    const onChange = () => {
      setMobile(mq.matches);
    };
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, [breakpoint]);
  return mobile;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SkyEngine | null>(null);
  const mapRef = useRef<EngineMapController | null>(null);
  const sourceRef = useRef(new FallbackSeriesSource(new ApiSeriesSource(), new DemoSeriesSource(), 60_000));
  const abortRef = useRef<AbortController | null>(null);
  const mapMenuRef = useRef<HTMLDetailsElement | null>(null);

  const initialParse = parseAppSearch(window.location.search);
  const mapOff = mapOffFromSearch(window.location.search);
  const bootState: AppUrlState =
    initialParse.kind === 'invalid'
      ? { target: null, ra: null, dec: null, fov: 40, plane: 0, t: 0, mode: 'loop', proj: 'SIN' }
      : initialParse.kind === 'empty'
        ? { ...initialParse.state, target: DEFAULT_TARGET }
        : initialParse.state.target || (initialParse.state.ra !== null && initialParse.state.dec !== null)
          ? initialParse.state
          : { ...initialParse.state, target: DEFAULT_TARGET };

  const [lang, setLang] = useState<Lang>(() => detectLang(window.location.search));
  const [plane, setPlane] = useState(bootState.plane);
  const [proj, setProj] = useState<Projection>(bootState.proj);
  const [activeSlug, setActiveSlug] = useState<string | null>(bootState.target);
  const [pick, setPick] = useState<{ ra: number; dec: number } | null>(
    bootState.ra !== null && bootState.dec !== null ? { ra: bootState.ra, dec: bootState.dec } : null,
  );
  const [markerScreen, setMarkerScreen] = useState<{ x: number; y: number } | null>(null);
  const [engineStatus, setEngineStatus] = useState(
    initialParse.kind === 'invalid' ? t(detectLang(window.location.search), 'urlInvalid') : '',
  );
  const [announce, setAnnounce] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile(820);

  const [seriesStatus, setSeriesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedSeries | null>(null);
  const [frameIndex, setFrameIndex] = useState(bootState.t);
  const [playing, setPlaying] = useState(!prefersReducedMotion());
  const [mode, setMode] = useState<ViewMode>(bootState.mode);
  const [lastLookup, setLastLookup] = useState<SeriesLookup | null>(null);
  const [engineOk, setEngineOk] = useState(!mapOff);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang, 'title');
  }, [lang]);

  useEffect(() => {
    if (mapOff || !canvasRef.current) return;
    let sky: SkyEngine;
    try {
      const target = bootState.target ? targetBySlug(bootState.target) : undefined;
      sky = createSkyEngine(canvasRef.current, {
        initialView: {
          ra: bootState.ra ?? target?.ra ?? 133.7952573,
          dec: bootState.dec ?? target?.dec ?? -7.245091,
          fov: bootState.fov,
          plane: bootState.plane,
          proj: bootState.proj,
        },
      });
    } catch (err) {
      setEngineOk(false);
      setEngineStatus(err instanceof Error ? err.message : t(lang, 'engineFail'));
      return;
    }
    engineRef.current = sky;
    mapRef.current = new EngineMapController(sky);
    setEngineOk(true);
    sky.on('status', setEngineStatus);
    sky.on('pick', p => {
      setPick(p);
      setAnnounce(`${p.ra.toFixed(4)}°, ${p.dec.toFixed(4)}°`);
    });
    sky.on('viewchange', v => {
      setPlane(v.plane);
      setProj(v.proj);
      const aim = pickRef.current;
      if (aim) {
        const scr = sky.screenPosition({ ra: aim.ra, dec: aim.dec });
        setMarkerScreen(scr);
      }
    });
    return () => {
      mapRef.current?.destroy();
      sky.destroy();
      engineRef.current = null;
      mapRef.current = null;
    };
  }, []);

  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    const sky = engineRef.current;
    if (!sky || !pick) {
      setMarkerScreen(null);
      return;
    }
    setMarkerScreen(sky.screenPosition({ ra: pick.ra, dec: pick.dec }));
  }, [pick, plane, proj]);

  useEffect(() => {
    const view = engineRef.current?.getView();
    const state: AppUrlState = {
      target: activeSlug,
      ra: view?.ra ?? pick?.ra ?? null,
      dec: view?.dec ?? pick?.dec ?? null,
      fov: view?.fov ?? 40,
      plane,
      t: frameIndex,
      mode,
      proj,
    };
    const params = new URLSearchParams((toAppSearch(state) || '?').slice(1));
    if (lang !== detectLang('')) params.set('lang', lang);
    else if (new URLSearchParams(window.location.search).has('lang')) params.set('lang', lang);
    if (mapOff) params.set('map', 'off');
    const next = params.toString() ? `?${params.toString()}` : '';
    if (window.location.search !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${next}`);
    }
  }, [activeSlug, pick, plane, proj, frameIndex, mode, lang, mapOff]);

  useEffect(() => {
    if (seriesStatus !== 'loading') {
      setProgress(null);
      return;
    }
    const start = performance.now();
    setProgress(seriesProgressMessage(lang, 0));
    const id = window.setInterval(() => {
      setProgress(seriesProgressMessage(lang, performance.now() - start));
    }, 400);
    return () => {
      window.clearInterval(id);
    };
  }, [seriesStatus, lang]);

  useEffect(() => {
    if (!playing || mode !== 'loop' || !loaded) return;
    const count = loaded.frames.length;
    let raf = 0;
    let last = performance.now();
    const interval = blinkIntervalMs(BLINK_HZ_DEFAULT);
    const tick = (now: number) => {
      if (now - last >= interval) {
        last = now;
        setFrameIndex(i => nextBlinkIndex(i, count));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [playing, mode, loaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        engineRef.current?.zoomBy(1 / 1.25);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        engineRef.current?.zoomBy(1.25);
      } else if (e.code === 'Space' && seriesStatus === 'ready') {
        e.preventDefault();
        setPlaying(p => !p);
        setMode('loop');
      } else if (e.code === 'ArrowRight' && loaded) {
        e.preventDefault();
        setPlaying(false);
        setFrameIndex(i => nextBlinkIndex(i, loaded.frames.length));
      } else if (e.code === 'ArrowLeft' && loaded) {
        e.preventDefault();
        setPlaying(false);
        setFrameIndex(i => prevBlinkIndex(i, loaded.frames.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [seriesStatus, loaded]);

  const loadSeries = (lookup: SeriesLookup, slug: string | null) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLastLookup(lookup);
    setActiveSlug(slug);
    setSeriesStatus('loading');
    setError(null);
    setLoaded(null);
    setFrameIndex(0);
    setAnnounce(t(lang, 'loading'));
    void sourceRef.current
      .load(lookup, ac.signal)
      .then(result => {
        if (ac.signal.aborted) return;
        setLoaded({ ...result, demoSlug: result.demoSlug ?? slug ?? undefined });
        setSeriesStatus('ready');
        setPlaying(!prefersReducedMotion() && mode === 'loop');
        setAnnounce(
          result.series.frames.length < 2 ? t(lang, 'noSeries') : `OK · ${String(result.series.frames.length)}`,
        );
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message =
          err instanceof SeriesSourceError
            ? err.detail ?? err.title
            : err instanceof Error
              ? err.message
              : t(lang, 'noSeries');
        setSeriesStatus('error');
        setError(message);
        setAnnounce(message);
      });
  };

  const analyzeCoords = async (ra: number, dec: number) => {
    setPick({ ra, dec });
    await mapRef.current?.flyTo({ ra, dec, fov: ANALYZE_FOV_DEG }, { reducedMotion: prefersReducedMotion() });
    loadSeries({ kind: 'coords', ra, dec, fov: FOV_ARCMIN }, null);
  };

  const selectTarget = async (slug: string) => {
    const target = targetBySlug(slug);
    const canonical = canonicalNameForSlug(slug);
    if (!target || !canonical) return;
    setActiveSlug(slug);
    setPick({ ra: target.ra, dec: target.dec });
    setAnnounce(target.name);
    await mapRef.current?.flyTo(
      { ra: target.ra, dec: target.dec, fov: ANALYZE_FOV_DEG },
      { reducedMotion: prefersReducedMotion() },
    );
    loadSeries({ kind: 'name', name: canonical }, slug);
  };

  const onSubmitQuery = (raw: string) => {
    const q = parseSearchQuery(raw);
    if (q.kind === 'target') void selectTarget(q.slug);
    else if (q.kind === 'coords') void analyzeCoords(q.ra, q.dec);
    else if (q.kind === 'name') {
      setActiveSlug(null);
      loadSeries({ kind: 'name', name: q.name }, null);
    } else if (q.kind === 'invalid') {
      setEngineStatus(q.reason);
    }
  };

  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    if (!mapOff && !engineRef.current) return;
    bootstrapped.current = true;
    if (initialParse.kind === 'invalid') return;
    if (bootState.target) void selectTarget(bootState.target);
    else if (bootState.ra !== null && bootState.dec !== null) void analyzeCoords(bootState.ra, bootState.dec);
  });

  const series = seriesStatus === 'ready' && loaded ? loaded.series : null;
  const frame =
    series && series.frames.length > 0
      ? series.frames[Math.min(frameIndex, series.frames.length - 1)]
      : null;
  const timeline = series
    ? buildTimeline(
        series.frames.map((f, index) => ({ index, t_mid: f.t_mid })),
        series.rejected.map(r => ({
          obs_id: r.obs_id,
          reason: r.reason,
          detail: r.detail,
        })),
      )
    : null;
  const level = series?.comparability.level ?? null;
  const motion = series ? describeExpectedMotionI18n(lang, series) : null;
  const demoNotice =
    loaded?.sourceKind === 'demo' ||
    (loaded?.notice && /offline|unavailable|timed out|unreachable/i.test(loaded.notice));
  const markerName =
    activeSlug != null ? (targetBySlug(activeSlug)?.name ?? activeSlug) : pick ? `${pick.ra.toFixed(2)}°, ${pick.dec.toFixed(2)}°` : '';
  const localizedEngine = localizeEngineStatus(lang, engineStatus);
  const showMapEngineNotice =
    Boolean(localizedEngine) && seriesStatus !== 'loading' && !localizedEngine.startsWith(t(lang, 'loading').slice(0, 12));

  const searchForm = (
    <form
      className="search-wrap"
      onSubmit={e => {
        e.preventDefault();
        onSubmitQuery(query);
        if (isMobile) setSearchOpen(false);
      }}
    >
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
        }}
        placeholder={t(lang, 'searchPlaceholder')}
        aria-label={t(lang, 'searchPlaceholder')}
        autoComplete="off"
      />
      <Tip title={t(lang, 'tipRaDecTitle')} body={t(lang, 'tipRaDecBody')} aboutLabel={t(lang, 'about')} />
      <button type="submit" className="go">
        {t(lang, 'searchSubmit')}
      </button>
    </form>
  );

  const explainBody = (
    <>
      {seriesStatus === 'idle' ? <p className="explain-copy">{t(lang, 'statusIdle')}</p> : null}
      {seriesStatus === 'loading' ? (
        <p className="explain-copy" role="status">
          {progress ?? t(lang, 'loading')}
        </p>
      ) : null}
      {seriesStatus === 'error' ? (
        <div role="alert" className="explain-error">
          <p className="explain-copy">{error}</p>
          <p className="explain-copy mono">{t(lang, 'demoOffline')}</p>
          <button
            type="button"
            className="go"
            onClick={() => {
              if (lastLookup) loadSeries(lastLookup, activeSlug);
            }}
          >
            {t(lang, 'retry')}
          </button>
        </div>
      ) : null}
      {seriesStatus === 'ready' && series && loaded ? (
        <>
          <p className="explain-status mono" role="status">
            {demoNotice ? t(lang, 'demoOffline') : t(lang, 'liveApi')}
            {loaded.notice && demoNotice ? ` · ${loaded.notice}` : ''}
          </p>
          <div className="cutout-block">
            <SeriesCutout
              loaded={loaded}
              frameIndex={frameIndex}
              mode={mode}
              label={frame ? formatVisitLabelI18n(lang, frameIndex, series.frames.length, frame.t_mid) : 'cutout'}
            />
            <p className="cutout-cap mono">
              {t(lang, 'cutoutBeforeAfter')}
              {frame ? ` · ${frame.t_mid.slice(0, 10)}` : ''}
            </p>
          </div>
          <div className="explain-text">
            <p>{describeWavelengthI18n(lang, series)}</p>
            <p>{describeTimeSpanI18n(lang, series.frames)}</p>
            {motion ? <p>{motion}</p> : null}
            {series.frames.length < 2 ? <p>{t(lang, 'noSeries')}</p> : null}
          </div>
          <div className="semaforo" aria-label="Interpretation levels">
            {(
              [
                ['OBSERVED', 'observed', 'observedHint'],
                ['EVALUATED', 'evaluated', 'evaluatedHint'],
                ['CONFIRMED', 'confirmed', 'confirmedHint'],
              ] as const
            ).map(([code, labelKey, hintKey]) => {
              const on = code === 'CONFIRMED' ? false : level === code;
              return (
                <div key={code} className={`semaforo-row${on ? ' on' : ''}`} data-on={on}>
                  <span className="semaforo-dot" aria-hidden="true" />
                  <div>
                    <strong>{t(lang, labelKey)}</strong>
                    <span>{t(lang, hintKey)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="explain-note">{t(lang, 'neverConfirmed')}</p>
          <details className="prov-details">
            <summary>{t(lang, 'provenance')}</summary>
            <dl className="prov-list mono">
              {frame ? (
                <>
                  <div>
                    <dt>{t(lang, 'provenanceFile')}</dt>
                    <dd>{frame.obs_id}</dd>
                  </div>
                  <div>
                    <dt>{t(lang, 'provenanceDate')}</dt>
                    <dd>{frame.t_mid.slice(0, 19)}Z</dd>
                  </div>
                  <div>
                    <dt>{t(lang, 'provenanceBand')}</dt>
                    <dd>λ {frame.wavelength_um.toFixed(3)} µm</dd>
                  </div>
                  <div>
                    <dt>{t(lang, 'provenanceCollection')}</dt>
                    <dd>{frame.provenance.collection ?? 'n/a'}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt>PM</dt>
                <dd>{motionProvenanceI18n(lang, activeSlug ?? loaded.demoSlug)}</dd>
              </div>
            </dl>
            {frame ? (
              <a href={frame.provenance.source_url} target="_blank" rel="noreferrer">
                IRSA
              </a>
            ) : null}
          </details>
          <a className="method-link" href="/#method">
            {t(lang, 'howCalculated')}
          </a>
        </>
      ) : null}
    </>
  );

  return (
    <div className={`viewer${mapOff || !engineOk ? ' map-off' : ''}${isMobile ? ' is-mobile' : ''}`}>
      <header className="topbar" role="banner">
        <a className="brand" href="/">
          {t(lang, 'brand')}
        </a>
        <div className="targets-scroll" role="toolbar" aria-label={t(lang, 'targetsLabel')}>
          {CHALLENGE_TARGETS.map(target => (
            <button
              key={target.slug}
              type="button"
              className="chip-text"
              aria-pressed={activeSlug === target.slug}
              onClick={() => {
                void selectTarget(target.slug);
              }}
            >
              {target.name}
            </button>
          ))}
        </div>
        {isMobile ? (
          <button
            type="button"
            className="search-toggle"
            aria-expanded={searchOpen}
            aria-label={t(lang, 'searchToggle')}
            onClick={() => {
              setSearchOpen(o => !o);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          searchForm
        )}
        <div className="lang" role="group" aria-label="Language">
          {(['es', 'en'] as const).map(code => (
            <button
              key={code}
              type="button"
              data-lang={code}
              aria-pressed={lang === code}
              onClick={() => {
                setLang(code);
                persistLang(code);
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      {isMobile && searchOpen ? <div className="search-popover">{searchForm}</div> : null}

      <div className="sky-layer" aria-hidden={mapOff || !engineOk}>
        <canvas
          ref={canvasRef}
          className="sky-canvas"
          tabIndex={0}
          aria-label="Sky map"
          data-testid="sky-map"
        />
        <div className="sky-vignette" aria-hidden="true" />
        {markerScreen ? (
          <div className="marker" style={{ left: markerScreen.x, top: markerScreen.y }} aria-hidden="true">
            <span className="marker-dot" />
            <span className="marker-ring" />
            {markerName ? <span className="marker-label mono">{markerName}</span> : null}
          </div>
        ) : null}
      </div>

      {mapOff ? (
        <p className="status-banner" role="status">
          {t(lang, 'mapOff')}
        </p>
      ) : null}

      {seriesStatus === 'loading' ? (
        <p className="load-toast" role="status" aria-live="polite">
          {progress ?? t(lang, 'loading')}
        </p>
      ) : null}

      {showMapEngineNotice && !mapOff ? (
        <p className="map-notice" role="status">
          {localizedEngine}
        </p>
      ) : null}

      {pick && seriesStatus === 'idle' ? (
        <button
          type="button"
          className="fab"
          onClick={() => {
            void analyzeCoords(pick.ra, pick.dec);
          }}
        >
          {t(lang, 'analyze')}
        </button>
      ) : null}

      <aside
        className={`explain${isMobile ? ' sheet' : ''}${isMobile && sheetOpen ? ' open' : ''}`}
        aria-label={t(lang, 'whatChanged')}
      >
        {isMobile ? (
          <button
            type="button"
            className="sheet-handle"
            aria-expanded={sheetOpen}
            onClick={() => {
              setSheetOpen(o => !o);
            }}
          >
            <span className="sheet-grip" aria-hidden="true" />
            <span className="sheet-title">{t(lang, 'whatChanged')}</span>
            {seriesStatus === 'ready' && series ? (
              <span className="sheet-line mono">
                {demoNotice ? t(lang, 'demoOffline') : t(lang, 'liveApi')}
              </span>
            ) : (
              <span className="sheet-line">{progress ?? t(lang, seriesStatus === 'idle' ? 'statusIdle' : 'loading')}</span>
            )}
            <span className="semaforo-dots" aria-hidden="true">
              <i data-on={level === 'OBSERVED'} />
              <i data-on={level === 'EVALUATED'} />
              <i data-on={false} />
            </span>
            <span className="sr-only">{sheetOpen ? t(lang, 'sheetCollapse') : t(lang, 'sheetExpand')}</span>
          </button>
        ) : (
          <h2>{t(lang, 'whatChanged')}</h2>
        )}
        <div className="explain-scroll">{explainBody}</div>
      </aside>

      <section className="dock" aria-label={t(lang, 'mapMenu')}>
        <div className="dock-body">
          <div className="dock-row timeline-row">
            <button
              type="button"
              className="pp"
              aria-label={playing ? t(lang, 'pause') : t(lang, 'play')}
              aria-pressed={playing}
              disabled={mode !== 'loop' || seriesStatus !== 'ready'}
              onClick={() => {
                setPlaying(p => !p);
                setMode('loop');
              }}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <rect x="2" y="1" width="3.5" height="12" rx="1" />
                  <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <path d="M3 1.5v11l9-5.5z" />
                </svg>
              )}
            </button>
            <div className="timeline" role="list">
              <div className="timeline-track" />
              {timeline?.markers.map(m =>
                m.kind === 'frame' ? (
                  <button
                    key={`f-${String(m.index)}`}
                    type="button"
                    className={`timeline-mark${m.index === frameIndex ? ' on' : ''}`}
                    style={{ left: `${String(m.fraction * 100)}%` }}
                    title={m.label}
                    aria-label={m.label}
                    aria-current={m.index === frameIndex ? 'true' : undefined}
                    onClick={() => {
                      setPlaying(false);
                      setFrameIndex(m.index);
                    }}
                  >
                    <span className="timeline-date mono">{m.label.slice(5)}</span>
                  </button>
                ) : (
                  <span
                    key={`r-${m.obs_id}`}
                    className="timeline-mark rejected"
                    style={{ left: `${String(m.fraction * 100)}%` }}
                    title={`${m.reason}: ${m.detail}`}
                  />
                ),
              )}
            </div>
          </div>
          <div className="dock-row modes-row">
            <div className="mode-chips" role="group" aria-label="View mode">
              {(
                [
                  ['loop', 'modeLoop'],
                  ['difference', 'modeDiff'],
                  ['colour', 'modeColour'],
                ] as const
              ).map(([value, key], i, arr) => (
                <span key={value} className="mode-item">
                  <button
                    type="button"
                    className="chip-text"
                    aria-pressed={mode === value}
                    onClick={() => {
                      setMode(value);
                      setPlaying(value === 'loop');
                    }}
                  >
                    {t(lang, key)}
                  </button>
                  {i < arr.length - 1 ? <span className="mode-sep" aria-hidden="true">·</span> : null}
                </span>
              ))}
            </div>
            <details className="map-menu" ref={mapMenuRef}>
              <summary>{t(lang, 'mapMenu')}</summary>
              <div className="menu-panel" role="group">
                <span className="menu-label">{t(lang, 'projection')}</span>
                {(['SIN', 'TAN', 'AIT'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={proj === p}
                    onClick={() => {
                      setProj(p);
                      engineRef.current?.setProjection(p);
                      mapRef.current?.setProjection(p);
                    }}
                  >
                    {p}
                  </button>
                ))}
                <span className="menu-label">{t(lang, 'zoom')}</span>
                <button
                  type="button"
                  onClick={() => {
                    engineRef.current?.zoomBy(1 / 1.25);
                  }}
                >
                  {t(lang, 'zoomIn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    engineRef.current?.zoomBy(1.25);
                  }}
                >
                  {t(lang, 'zoomOut')}
                </button>
              </div>
            </details>
          </div>
          <BandBars
            plane={plane}
            label={t(lang, 'band')}
            onChange={v => {
              setPlane(v);
              engineRef.current?.setPlane(v);
              mapRef.current?.setPlane(v);
            }}
          />
        </div>
      </section>

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
