import { useEffect, useReducer, useRef, useState, type SyntheticEvent } from 'react';
import { EngineMapController } from '../../src/app/adapters/engine-map-controller';
import { parseSearchQuery } from '../../src/app/core/search';
import { buildTimeline } from '../../src/app/core/timeline';
import { canonicalNameForSlug, CHALLENGE_TARGETS, targetBySlug } from '../../src/app/core/targets';
import { parseAppSearch, toAppSearch, type AppUrlState, type Projection, type ViewMode } from '../../src/app/core/url-state';
import { createSkyEngine, maxFov, type SkyEngine } from '../../src/engine/engine';
import { ApiSeriesSource, FallbackSeriesSource } from '../../src/series/adapters/api-source';
import { DemoSeriesSource } from '../../src/series/adapters/demo-source';
import { PrefetchingSeriesSource } from './prefetch-source';
import { BLINK_HZ_DEFAULT, blinkIntervalMs, nextBlinkIndex, prevBlinkIndex } from '../../src/series/core/blink';
import type { LoadedSeries, SeriesLookup } from '../../src/series/ports/series-source';
import { SeriesSourceError } from '../../src/series/ports/series-source';
import { createCompositeCatalog, featuredEntries } from './catalog/composite-source';
import { isSearchAbort } from './catalog/api-source';
import type { CatalogEntry } from './catalog/port';
import { BandBars } from './components/BandBars';
import { CutoutCarousel } from './components/CutoutCarousel';
import { HoverTip } from './components/HoverTip';
import { classifySeriesError, demoDoesNotCoverPoint, type SeriesErrorKey } from './errors';
import { IntroGuide } from './components/IntroGuide';
import { Tip } from './components/Tip';
import {
  describeChangeLineI18n,
  describeExpectedMotionI18n,
  describeTimeSpanI18n,
  describeWavelengthI18n,
  localizeEngineStatus,
  motionProvenanceI18n,
} from './explain-i18n';
import {
  detectLang,
  formatPointTitle,
  persistLang,
  returnLabel,
  seriesProgressMessage,
  t,
  targetDescription,
  type Lang,
} from './i18n';
import { featuredLabelVisibility } from './featured-marker-layout';
import { delay, INTRO_DELAY_MS, INTRO_FLY_MS, INTRO_GLOBE } from './intro-flight';
import { shouldShowIntro } from './intro';
import { timelineDateVisibility } from './timeline-labels';
import { formatLightLabel, formatVisitDate } from './light-label';
import { parseNameParam } from './name-url';
import {
  describeMotionAnalysis,
  describePairCheck,
  loadMotionAnalysis,
  loadPairCheck,
  motionDetailRows,
  pairCheckRows,
  type MotionAnalysis,
  type PairCheck,
} from './analysis/motion-analysis';
import {
  createSelection,
  reduceSelection,
  shouldOfferReturn,
  type SelectionState,
  type SkyCoords,
} from './selection';

const ANALYZE_FOV_DEG = 0.5;
const FOV_ARCMIN = 5;
const DEFAULT_TARGET = 'wise-0855';
const GLOBE_FOV_THRESHOLD = 45;

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

function bootSelection(state: AppUrlState, nameFromUrl: string | null): SelectionState {
  if (state.target) {
    const target = targetBySlug(state.target);
    if (target) {
      return createSelection({
        mode: 'target',
        slug: target.slug,
        coords: { ra: target.ra, dec: target.dec },
      });
    }
  }
  if (nameFromUrl) {
    return createSelection({
      mode: 'named',
      slug: null,
      catalogName: nameFromUrl,
      catalogKind: null,
      catalogDescription: null,
      coords: { ra: 0, dec: 0 },
    });
  }
  if (state.ra !== null && state.dec !== null) {
    return createSelection({
      mode: 'custom',
      slug: null,
      coords: { ra: state.ra, dec: state.dec },
    });
  }
  const fallback = targetBySlug(DEFAULT_TARGET) ?? CHALLENGE_TARGETS[0];
  return createSelection({
    mode: 'target',
    slug: fallback.slug,
    coords: { ra: fallback.ra, dec: fallback.dec },
  });
}

function stopUiBubble(e: SyntheticEvent): void {
  e.stopPropagation();
}

function modeHelpKey(mode: ViewMode): 'modeHelpLoop' | 'modeHelpDiff' | 'modeHelpColour' {
  if (mode === 'difference') return 'modeHelpDiff';
  if (mode === 'colour') return 'modeHelpColour';
  return 'modeHelpLoop';
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const engineRef = useRef<SkyEngine | null>(null);
  const mapRef = useRef<EngineMapController | null>(null);
  const sourceRef = useRef(
    new PrefetchingSeriesSource(new FallbackSeriesSource(new ApiSeriesSource(), new DemoSeriesSource(), 60_000)),
  );
  const abortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const catalogRef = useRef(createCompositeCatalog({ lang: detectLang(window.location.search) }));
  const selectionRef = useRef<SelectionState | null>(null);
  const featuredRef = useRef<CatalogEntry[]>([]);

  const initialParse = parseAppSearch(window.location.search);
  const nameParse = parseNameParam(window.location.search);
  const nameFromUrl = nameParse.kind === 'ok' ? nameParse.name : null;
  const mapOff = mapOffFromSearch(window.location.search);
  const bootState: AppUrlState =
    initialParse.kind === 'invalid'
      ? { target: null, ra: null, dec: null, fov: 40, plane: 0, t: 0, mode: 'loop', proj: 'SIN' }
      : initialParse.kind === 'empty'
        ? { ...initialParse.state, target: nameFromUrl ? null : DEFAULT_TARGET }
        : initialParse.state.target ||
            nameFromUrl ||
            (initialParse.state.ra !== null && initialParse.state.dec !== null)
          ? { ...initialParse.state, target: nameFromUrl ? null : initialParse.state.target }
          : { ...initialParse.state, target: DEFAULT_TARGET };

  const [lang, setLang] = useState<Lang>(() => detectLang(window.location.search));
  const [plane, setPlane] = useState(bootState.plane);
  const [proj, setProj] = useState<Projection>(bootState.proj);
  const [selection, dispatchSelection] = useReducer(
    reduceSelection,
    undefined,
    () => bootSelection(bootState, nameFromUrl),
  );
  selectionRef.current = selection;

  const [featured, setFeatured] = useState<CatalogEntry[]>(() => featuredEntries(lang));
  featuredRef.current = featured;
  const [markerScreen, setMarkerScreen] = useState<{ x: number; y: number } | null>(null);
  const [candidateScreen, setCandidateScreen] = useState<{ x: number; y: number } | null>(null);
  const [offerReturn, setOfferReturn] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState(
    initialParse.kind === 'invalid' || nameParse.kind === 'invalid'
      ? t(detectLang(window.location.search), 'urlInvalid')
      : '',
  );
  const [announce, setAnnounce] = useState('');
  const [query, setQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'empty' | 'searching' | 'results' | 'none' | 'error'>(
    'idle',
  );
  const [searchResults, setSearchResults] = useState<CatalogEntry[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cutoutOpen, setCutoutOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [lightOpen, setLightOpen] = useState(false);
  // Colour mode opens the light picker once; keep it optional afterwards.
  const [mapHintVisible, setMapHintVisible] = useState(true);
  const [introOpen, setIntroOpen] = useState(() => shouldShowIntro());
  const [introFlying, setIntroFlying] = useState(() => !mapOff && !prefersReducedMotion());
  const [viewFov, setViewFov] = useState(bootState.fov);
  const [featuredScreens, setFeaturedScreens] = useState<
    Record<string, { x: number; y: number } | null>
  >({});
  const introFlyAbort = useRef<AbortController | null>(null);
  const isMobile = useIsMobile(820);

  const [seriesStatus, setSeriesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<SeriesErrorKey>('errGeneric');
  const [loaded, setLoaded] = useState<LoadedSeries | null>(null);
  const [measured, setMeasured] = useState<MotionAnalysis | null>(null);
  const [pairCheck, setPairCheck] = useState<PairCheck | null>(null);
  const [frameIndex, setFrameIndex] = useState(bootState.t);
  const [playing, setPlaying] = useState(!prefersReducedMotion());
  const [mode, setMode] = useState<ViewMode>(bootState.mode);
  const [lastLookup, setLastLookup] = useState<SeriesLookup | null>(null);
  const [engineOk, setEngineOk] = useState(!mapOff);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el || isMobile) {
      setTimelineWidth(0);
      return;
    }
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setTimelineWidth(w);
    });
    ro.observe(el);
    setTimelineWidth(el.getBoundingClientRect().width);
    return () => {
      ro.disconnect();
    };
  }, [isMobile, seriesStatus]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang, 'title');
    catalogRef.current = createCompositeCatalog({ lang });
    void catalogRef.current.featured().then(setFeatured);
  }, [lang]);

  // Warm the featured series one at a time (boot target first) so picking one is instant.
  useEffect(() => {
    if (featured.length === 0) return undefined;
    const state = { cancelled: false };
    const boot = bootState.target;
    const ordered = [...featured].sort((a, b) => Number(b.slug === boot) - Number(a.slug === boot));
    void (async () => {
      for (const entry of ordered) {
        if (state.cancelled) return;
        await sourceRef.current.load(catalogRef.current.resolve(entry)).catch(() => undefined);
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [featured]);

  useEffect(() => {
    const sky = engineRef.current;
    if (!sky) return;
    const next: Record<string, { x: number; y: number } | null> = {};
    for (const entry of featured) {
      next[entry.id] = sky.screenPosition({ ra: entry.ra, dec: entry.dec });
    }
    setFeaturedScreens(next);
  }, [featured]);

  useEffect(() => {
    if (mapOff || !canvasRef.current) return;
    let sky: SkyEngine;
    try {
      const target = bootState.target ? targetBySlug(bootState.target) : undefined;
      const globeBoot = !prefersReducedMotion();
      sky = createSkyEngine(canvasRef.current, {
        initialView: globeBoot
          ? {
              ra: INTRO_GLOBE.ra,
              dec: INTRO_GLOBE.dec,
              fov: INTRO_GLOBE.fov,
              plane: bootState.plane,
              proj: INTRO_GLOBE.proj,
            }
          : {
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
      dispatchSelection({ type: 'set_candidate', coords: { ra: p.ra, dec: p.dec } });
      setAnnounce(`${p.ra.toFixed(4)}°, ${p.dec.toFixed(4)}°`);
      setMapHintVisible(false);
    });
    sky.on('viewchange', v => {
      setPlane(v.plane);
      setProj(v.proj);
      setViewFov(v.fov);
      setMapHintVisible(false);
      const sel = selectionRef.current;
      const nextFeatured: Record<string, { x: number; y: number } | null> = {};
      for (const entry of featuredRef.current) {
        nextFeatured[entry.id] = sky.screenPosition({ ra: entry.ra, dec: entry.dec });
      }
      setFeaturedScreens(nextFeatured);
      if (!sel) return;
      const scr = sky.screenPosition({ ra: sel.coords.ra, dec: sel.coords.dec });
      setMarkerScreen(scr);
      if (sel.candidate) {
        setCandidateScreen(sky.screenPosition({ ra: sel.candidate.ra, dec: sel.candidate.dec }));
      } else {
        setCandidateScreen(null);
      }
      setOfferReturn(shouldOfferReturn(sel.coords, { ra: v.ra, dec: v.dec }, v.fov) || scr === null);
    });
    return () => {
      mapRef.current?.destroy();
      sky.destroy();
      engineRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sky = engineRef.current;
    if (!sky) {
      setMarkerScreen(null);
      setCandidateScreen(null);
      return;
    }
    setMarkerScreen(sky.screenPosition({ ra: selection.coords.ra, dec: selection.coords.dec }));
    if (selection.candidate) {
      setCandidateScreen(sky.screenPosition({ ra: selection.candidate.ra, dec: selection.candidate.dec }));
    } else {
      setCandidateScreen(null);
    }
    const view = sky.getView();
    const scr = sky.screenPosition({ ra: selection.coords.ra, dec: selection.coords.dec });
    setOfferReturn(shouldOfferReturn(selection.coords, { ra: view.ra, dec: view.dec }, view.fov) || scr === null);
  }, [selection, plane, proj]);

  useEffect(() => {
    const view = engineRef.current?.getView();
    const state: AppUrlState = {
      target: selection.mode === 'target' ? selection.slug : null,
      ra: selection.mode === 'custom' ? selection.coords.ra : (view?.ra ?? null),
      dec: selection.mode === 'custom' ? selection.coords.dec : (view?.dec ?? null),
      fov: view?.fov ?? 40,
      plane,
      t: frameIndex,
      mode,
      proj,
    };
    const params = new URLSearchParams((toAppSearch(state) || '?').slice(1));
    if (selection.mode === 'named' && selection.catalogName) {
      params.delete('target');
      params.delete('ra');
      params.delete('dec');
      params.set('name', selection.catalogName);
    } else {
      params.delete('name');
    }
    if (lang !== detectLang('')) params.set('lang', lang);
    else if (new URLSearchParams(window.location.search).has('lang')) params.set('lang', lang);
    if (mapOff) params.set('map', 'off');
    const next = params.toString() ? `?${params.toString()}` : '';
    if (window.location.search !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${next}`);
    }
  }, [selection, plane, proj, frameIndex, mode, lang, mapOff]);

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
    searchAbortRef.current?.abort();
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchStatus('idle');
      return;
    }
    const parsed = parseSearchQuery(q);
    if (parsed.kind === 'coords') {
      setSearchResults([
        {
          id: `coords:${String(parsed.ra)},${String(parsed.dec)}`,
          name: formatPointTitle(lang, parsed.ra, parsed.dec),
          kind: lang === 'es' ? 'Coordenadas' : 'Coordinates',
          description: t(lang, 'tipRaDecBody'),
          ra: parsed.ra,
          dec: parsed.dec,
          featured: false,
        },
      ]);
      setSearchStatus('results');
      return;
    }
    const ac = new AbortController();
    searchAbortRef.current = ac;
    setSearchStatus('searching');
    void catalogRef.current
      .search(q, ac.signal)
      .then(rows => {
        if (ac.signal.aborted) return;
        setSearchResults(rows);
        setSearchStatus(rows.length === 0 ? 'none' : 'results');
      })
      .catch((err: unknown) => {
        if (isSearchAbort(err) || ac.signal.aborted) return;
        setSearchResults([]);
        setSearchStatus('error');
      });
    return () => {
      ac.abort();
    };
  }, [query, lang]);

  const loadSeries = (lookup: SeriesLookup, slug: string | null) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLastLookup(lookup);
    setSeriesStatus('loading');
    setError(null);
    setLoaded(null);
    setFrameIndex(0);
    setAnnounce(t(lang, 'loading'));
    void sourceRef.current
      .load(lookup, ac.signal)
      .then(result => {
        if (ac.signal.aborted) return;
        if (demoDoesNotCoverPoint(lookup, result)) {
          // offline, the recorded photos belong to a featured object, not to the spot that was picked
          setSeriesStatus('error');
          setErrorKey('errDemoOnly');
          setError(null);
          setLoaded(null);
          setAnnounce(t(lang, 'errDemoOnly'));
          return;
        }
        setLoaded({ ...result, demoSlug: result.demoSlug ?? slug ?? undefined });
        setSeriesStatus('ready');
        setPlaying(!prefersReducedMotion() && mode === 'loop');
        const n = result.series.frames.length;
        setAnnounce(n < 2 ? t(lang, 'noSeriesFriendly') : `OK · ${String(n)}`);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        // Friendly empty-series state instead of a technical error when possible.
        const isEmpty =
          err instanceof SeriesSourceError &&
          (err.status === 404 || /no comparable|not enough|no visits|sin visitas/i.test(err.detail ?? err.title));
        if (isEmpty) {
          setSeriesStatus('ready');
          setLoaded(null);
          setError(null);
          setAnnounce(t(lang, 'noSeriesFriendly'));
          return;
        }
        const message =
          err instanceof SeriesSourceError
            ? err.detail ?? err.title
            : err instanceof Error
              ? err.message
              : t(lang, 'noSeriesFriendly');
        setSeriesStatus('error');
        setErrorKey(classifySeriesError(err));
        setError(message);
        setAnnounce(message);
      });
  };

  const analyzeCoords = async (coords: SkyCoords, options: { skipFly?: boolean } = {}) => {
    dispatchSelection({ type: 'set_custom', coords });
    setAnnounce(formatPointTitle(lang, coords.ra, coords.dec));
    if (!options.skipFly) {
      await mapRef.current?.flyTo(
        { ra: coords.ra, dec: coords.dec, fov: ANALYZE_FOV_DEG },
        { reducedMotion: prefersReducedMotion() },
      );
    } else if (engineRef.current) {
      const v = engineRef.current.getView();
      engineRef.current.setView({ ra: coords.ra, dec: coords.dec, fov: ANALYZE_FOV_DEG, plane: v.plane, proj: v.proj });
    }
    loadSeries({ kind: 'coords', ra: coords.ra, dec: coords.dec, fov: FOV_ARCMIN }, null);
  };

  const analyzeCandidate = async () => {
    const cand = selectionRef.current?.candidate;
    if (!cand) return;
    dispatchSelection({ type: 'analyze_candidate' });
    setAnnounce(formatPointTitle(lang, cand.ra, cand.dec));
    await mapRef.current?.flyTo(
      { ra: cand.ra, dec: cand.dec, fov: ANALYZE_FOV_DEG },
      { reducedMotion: prefersReducedMotion() },
    );
    loadSeries({ kind: 'coords', ra: cand.ra, dec: cand.dec, fov: FOV_ARCMIN }, null);
  };

  const selectEntry = async (entry: CatalogEntry, options: { skipFly?: boolean } = {}) => {
    setQuery('');
    setSearchResults([]);
    setSearchStatus('idle');
    const fly = !options.skipFly;
    if (entry.featured && entry.slug) {
      dispatchSelection({
        type: 'select_target',
        slug: entry.slug,
        coords: { ra: entry.ra, dec: entry.dec },
      });
      setAnnounce(entry.name);
      if (fly) {
        await mapRef.current?.flyTo(
          { ra: entry.ra, dec: entry.dec, fov: ANALYZE_FOV_DEG },
          { reducedMotion: prefersReducedMotion() },
        );
      } else {
        engineRef.current?.setView({
          ra: entry.ra,
          dec: entry.dec,
          fov: ANALYZE_FOV_DEG,
          plane: engineRef.current.getView().plane,
          proj: engineRef.current.getView().proj,
        });
      }
      const lookup = catalogRef.current.resolve(entry);
      loadSeries(lookup, entry.slug);
      return;
    }
    dispatchSelection({
      type: 'select_named',
      name: entry.name,
      coords: { ra: entry.ra, dec: entry.dec },
      kind: entry.kind,
      description: entry.description,
    });
    setAnnounce(entry.name);
    if (fly) {
      await mapRef.current?.flyTo(
        { ra: entry.ra, dec: entry.dec, fov: ANALYZE_FOV_DEG },
        { reducedMotion: prefersReducedMotion() },
      );
    } else if (engineRef.current) {
      const v = engineRef.current.getView();
      engineRef.current.setView({
        ra: entry.ra,
        dec: entry.dec,
        fov: ANALYZE_FOV_DEG,
        plane: v.plane,
        proj: v.proj,
      });
    }
    loadSeries(catalogRef.current.resolve(entry), null);
  };

  const selectTarget = async (slug: string, options: { skipFly?: boolean } = {}) => {
    const entry = featured.find(f => f.slug === slug) ?? featuredEntries(lang).find(f => f.slug === slug);
    if (entry) {
      await selectEntry(entry, options);
      return;
    }
    const target = targetBySlug(slug);
    const canonical = canonicalNameForSlug(slug);
    if (!target || !canonical) return;
    await selectEntry({
      id: slug,
      name: target.name,
      kind: '',
      description: targetDescription(lang, slug),
      ra: target.ra,
      dec: target.dec,
      featured: true,
      slug,
    });
  };

  const returnToLastTarget = async () => {
    const slug = selection.lastTargetSlug ?? selection.slug;
    if (!slug) return;
    await selectTarget(slug);
  };

  const centerOnObject = async () => {
    const c = selectionRef.current?.coords;
    if (!c) return;
    await mapRef.current?.flyTo(
      { ra: c.ra, dec: c.dec, fov: ANALYZE_FOV_DEG },
      { reducedMotion: prefersReducedMotion() },
    );
  };

  const skipIntroFlight = () => {
    introFlyAbort.current?.abort();
    introFlyAbort.current = null;
    const sky = engineRef.current;
    const sel = selectionRef.current;
    if (sky && sel) {
      sky.setView({
        ra: sel.coords.ra,
        dec: sel.coords.dec,
        fov: ANALYZE_FOV_DEG,
        plane: sky.getView().plane,
        proj: sky.getView().proj,
      });
    }
    setIntroFlying(false);
  };

  const runEntryFlight = async (
    target: { ra: number; dec: number },
    after: () => void | Promise<void>,
  ): Promise<void> => {
    const sky = engineRef.current;
    const map = mapRef.current;
    if (!sky || !map || mapOff) {
      setIntroFlying(false);
      await after();
      return;
    }
    if (prefersReducedMotion()) {
      sky.setView({
        ra: target.ra,
        dec: target.dec,
        fov: ANALYZE_FOV_DEG,
        plane: sky.getView().plane,
        proj: sky.getView().proj,
      });
      setIntroFlying(false);
      await after();
      return;
    }
    introFlyAbort.current?.abort();
    const ac = new AbortController();
    introFlyAbort.current = ac;
    setIntroFlying(true);
    sky.setView({
      ra: INTRO_GLOBE.ra,
      dec: INTRO_GLOBE.dec,
      fov: maxFov('SIN'),
      plane: sky.getView().plane,
      proj: 'SIN',
    });
    try {
      await delay(INTRO_DELAY_MS, ac.signal);
      await map.flyTo({ ra: target.ra, dec: target.dec, fov: ANALYZE_FOV_DEG }, { durationMs: INTRO_FLY_MS });
    } catch {
      if (!ac.signal.aborted) {
        sky.setView({
          ra: target.ra,
          dec: target.dec,
          fov: ANALYZE_FOV_DEG,
          plane: sky.getView().plane,
          proj: sky.getView().proj,
        });
      }
    }
    introFlyAbort.current = null;
    setIntroFlying(false);
    await after();
  };

  const bumpFrame = (next: number) => {
    setPlaying(false);
    setFrameIndex(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (selectionRef.current?.candidate) {
          e.preventDefault();
          dispatchSelection({ type: 'clear_candidate' });
          setAnnounce('');
          return;
        }
        if (cutoutOpen) {
          setCutoutOpen(false);
          return;
        }
        if (detailsOpen) {
          setDetailsOpen(false);
          return;
        }
      }
      if (e.key === 'Enter' && selectionRef.current?.candidate) {
        e.preventDefault();
        void analyzeCandidate();
        return;
      }
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
        bumpFrame(nextBlinkIndex(frameIndex, loaded.frames.length));
      } else if (e.code === 'ArrowLeft' && loaded) {
        e.preventDefault();
        bumpFrame(prevBlinkIndex(frameIndex, loaded.frames.length));
      } else if (introFlying && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        skipIntroFlight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [seriesStatus, loaded, cutoutOpen, detailsOpen, lang, frameIndex, introFlying]);

  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    if (!mapOff && !engineRef.current) return;
    bootstrapped.current = true;
    if (initialParse.kind === 'invalid' || nameParse.kind === 'invalid') return;
    if (nameFromUrl) {
      void (async () => {
        try {
          const hits = await catalogRef.current.search(nameFromUrl);
          const exact = hits.find(h => h.name.toLowerCase() === nameFromUrl.toLowerCase());
          const hit = exact ?? (hits.length > 0 ? hits[0] : undefined);
          if (hit !== undefined) {
            await runEntryFlight({ ra: hit.ra, dec: hit.dec }, () => selectEntry(hit, { skipFly: true }));
            return;
          }
        } catch {
          /* fall through to name-only load */
        }
        setIntroFlying(false);
        dispatchSelection({
          type: 'select_named',
          name: nameFromUrl,
          coords: selectionRef.current?.coords ?? { ra: 0, dec: 0 },
        });
        loadSeries({ kind: 'name', name: nameFromUrl }, null);
      })();
      return;
    }
    const bootSlug = bootState.target;
    if (bootSlug) {
      const tg = targetBySlug(bootSlug);
      if (tg) {
        void runEntryFlight({ ra: tg.ra, dec: tg.dec }, () => selectTarget(bootSlug, { skipFly: true }));
      }
      return;
    }
    if (bootState.ra !== null && bootState.dec !== null) {
      const coords = { ra: bootState.ra, dec: bootState.dec };
      void runEntryFlight(coords, () => analyzeCoords(coords, { skipFly: true }));
    }
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
  const measuredSlug = selection.mode === 'target' ? selection.slug : null;
  useEffect(() => {
    setMeasured(null);
    setPairCheck(null);
    if (!measuredSlug) return undefined;
    const ac = new AbortController();
    void loadMotionAnalysis(measuredSlug, ac.signal).then(m => {
      if (!ac.signal.aborted) setMeasured(m);
    });
    void loadPairCheck(measuredSlug, ac.signal).then(p => {
      if (!ac.signal.aborted) setPairCheck(p);
    });
    return () => {
      ac.abort();
    };
  }, [measuredSlug]);
  // the result file caps the traffic light (interpretation_ceiling = OBSERVED)
  const rawLevel = series?.comparability.level ?? null;
  // a spot the visitor picked is not a known object: no traffic-light level, no claim about what changed
  const isCustom = selection.mode === 'custom';
  const level = isCustom ? null : measured && rawLevel === 'EVALUATED' ? 'OBSERVED' : rawLevel;
  const motion = series ? describeExpectedMotionI18n(lang, series) : null;
  const demoNotice =
    loaded?.sourceKind === 'demo' ||
    (loaded?.notice && /offline|unavailable|timed out|unreachable/i.test(loaded.notice));

  const activeTarget = selection.mode === 'target' && selection.slug ? targetBySlug(selection.slug) : undefined;
  const lastTarget = selection.lastTargetSlug ? targetBySlug(selection.lastTargetSlug) : undefined;

  const titleName =
    selection.mode === 'named' && selection.catalogName
      ? selection.catalogName
      : activeTarget
        ? activeTarget.name
        : selection.mode === 'custom'
          ? formatPointTitle(lang, selection.coords.ra, selection.coords.dec)
          : '';

  const titleDesc = (() => {
    if (selection.mode === 'named') {
      const kind = selection.catalogKind?.trim() || '';
      const desc = selection.catalogDescription?.trim() || '';
      if (kind && desc && desc !== kind) return `${kind} — ${desc}`;
      return kind || desc;
    }
    if (activeTarget) return targetDescription(lang, activeTarget.slug);
    if (selection.mode === 'custom') return t(lang, 'customDesc');
    return '';
  })();

  const measuredLine = measured ? describeMotionAnalysis(lang, measured, titleName || '—') : null;
  const changeLine =
    seriesStatus === 'ready' && series && isCustom
      ? t(lang, 'customChange')
      : seriesStatus === 'ready' && series && measuredLine
      ? measuredLine
      : seriesStatus === 'ready' && series
      ? describeChangeLineI18n(lang, series, titleName || '—', {
          slug: selection.mode === 'target' ? selection.slug : null,
        })
      : seriesStatus === 'ready' && !series
        ? t(lang, 'noSeriesFriendly')
        : seriesStatus === 'loading'
          ? (progress ?? t(lang, 'loading'))
          : seriesStatus === 'error'
            ? t(lang, errorKey)
            : t(lang, 'statusIdle');

  const localizedEngine = localizeEngineStatus(lang, engineStatus);
  const showMapEngineNotice =
    Boolean(localizedEngine) && seriesStatus !== 'loading' && !localizedEngine.startsWith(t(lang, 'loading').slice(0, 12));
  const showBands = lightOpen;
  const returnName = lastTarget?.name ?? activeTarget?.name ?? '';
  const frameCount = series?.frames.length ?? 0;
  const frameMarkers = timeline ? timeline.markers.filter(m => m.kind === 'frame') : [];
  const visibleDateIndices =
    frameMarkers.length > 0
      ? timelineDateVisibility(
          frameMarkers.map(m => m.index),
          frameMarkers.map(m => m.fraction),
          frameIndex,
          timelineWidth,
        )
      : new Set<number>();
  const photoLabel =
    frameCount > 0
      ? `${t(lang, 'photoOf')} ${String(frameIndex + 1)} ${t(lang, 'photoOfOf')} ${String(frameCount)}`
      : '';

  const catalogSearch = (
    <div className="catalog-search" data-intro="catalog-search">
      <label className="objects-label" htmlFor="copernix-catalog-q">
        {t(lang, 'catalogSearchLabel')}
      </label>
      <div className="search-wrap catalog-search-wrap">
        <input
          id="copernix-catalog-q"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
          }}
          placeholder={t(lang, 'searchPlaceholder')}
          aria-label={t(lang, 'searchPlaceholder')}
          autoComplete="off"
          data-testid="catalog-search"
        />
        <Tip title={t(lang, 'tipRaDecTitle')} body={t(lang, 'tipRaDecBody')} aboutLabel={t(lang, 'about')} />
      </div>
      {searchStatus === 'searching' ? (
        <p className="search-status mono" role="status">
          {t(lang, 'searchSearching')}
        </p>
      ) : null}
      {searchStatus === 'none' ? (
        <p className="search-status" role="status">
          {t(lang, 'searchNoResults')}
        </p>
      ) : null}
      {searchStatus === 'error' ? (
        <p className="search-status" role="alert">
          {t(lang, 'searchError')}
        </p>
      ) : null}
      {searchStatus === 'results' && searchResults.length > 0 ? (
        <ul className="search-results" role="listbox" aria-label={t(lang, 'catalogSearchLabel')}>
          {searchResults.map(row => (
            <li key={row.id}>
              <button
                type="button"
                className="search-hit"
                role="option"
                onClick={() => {
                  void selectEntry(row);
                }}
              >
                <span className="search-hit-name">{row.name}</span>
                <span className="search-hit-kind mono">{row.kind}</span>
                <span className="search-hit-desc">{row.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const featuredList = (
    <div className={`objects${isCustom ? ' objects-compact' : ''}`} role="toolbar" aria-label={t(lang, 'targetsLabel')} data-intro="catalog">
      <p className="objects-label">{t(lang, 'targetsLabel')}</p>
      {featured.map(entry => (
        <button
          key={entry.id}
          type="button"
          className="object-link"
          aria-pressed={
            (selection.mode === 'target' && selection.slug === entry.slug) ||
            (selection.mode === 'named' && selection.catalogName === entry.name)
          }
          onClick={() => {
            void selectEntry(entry);
          }}
        >
          <i className="object-dot" aria-hidden="true" />
          {entry.name}
        </button>
      ))}
      {selection.mode !== 'target' && lastTarget ? (
        <button
          type="button"
          className="text-link return-inline"
          data-testid="return-to-target-inline"
          onClick={() => {
            void returnToLastTarget();
          }}
        >
          {returnLabel(lang, lastTarget.name)}
        </button>
      ) : null}
    </div>
  );

  const provenanceBody = seriesStatus === 'ready' && series && loaded ? (
    <div className="prov-body">
      <p className="explain-status mono" role="status">
        {demoNotice ? t(lang, 'demoOffline') : t(lang, 'liveApi')}
        {loaded.notice && demoNotice ? ` · ${loaded.notice}` : ''}
      </p>
      <div className="explain-text">
        <p>{describeWavelengthI18n(lang, series)}</p>
        <p>{describeTimeSpanI18n(lang, series.frames)}</p>
        {motion && !isCustom ? <p>{motion}</p> : null}
        {series.frames.length < 2 ? <p>{t(lang, 'noSeriesFriendly')}</p> : null}
        {measured ? (
          <>
            <p className="explain-note">{lang === 'es' ? 'Medición de movimiento (resultado precalculado)' : 'Motion measurement (precomputed result)'}</p>
            <dl className="prov-list mono">
              {[...motionDetailRows(lang, measured), ...(pairCheck ? pairCheckRows(lang, pairCheck) : [])].map(r => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            {measured.independenceNote ? <p className="explain-note">{measured.independenceNote}</p> : null}
          </>
        ) : null}
        <p className="explain-note">{t(lang, 'neverConfirmed')}</p>
      </div>
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
              <dd>{formatLightLabel(frame.wavelength_um, lang)}</dd>
            </div>
            <div>
              <dt>{t(lang, 'provenanceCollection')}</dt>
              <dd>{frame.provenance.collection ?? 'n/a'}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>PM</dt>
          <dd>{motionProvenanceI18n(lang, selection.slug ?? loaded.demoSlug)}</dd>
        </div>
      </dl>
      <label className="hidden-toggle">
        <input
          type="checkbox"
          checked={showHidden}
          onChange={e => {
            setShowHidden(e.target.checked);
          }}
        />
        <span>{t(lang, 'showHiddenPixels')}</span>
      </label>
      {frame ? (
        <a href={frame.provenance.source_url} target="_blank" rel="noreferrer">
          IRSA
        </a>
      ) : null}
      <a className="method-link" href="/#method">
        {t(lang, 'howCalculated')}
      </a>
    </div>
  ) : seriesStatus === 'error' ? (
    <div role="alert" className="explain-error">
      <p className="explain-copy">{t(lang, errorKey)}</p>
      {error ? <p className="explain-copy mono">{error}</p> : null}
      <button
        type="button"
        className="go"
        onClick={() => {
          if (lastLookup) loadSeries(lastLookup, selection.slug);
        }}
      >
        {t(lang, 'retry')}
      </button>
    </div>
  ) : seriesStatus === 'ready' && !series ? (
    <p className="explain-copy">{t(lang, 'noSeriesFriendly')}</p>
  ) : (
    <p className="explain-copy">{progress ?? t(lang, 'statusIdle')}</p>
  );

  const cutoutCap =
    frame != null
      ? `${t(lang, 'cutoutBeforeAfter')} · ${formatVisitDate(frame.t_mid, lang)} · ${formatLightLabel(frame.wavelength_um, lang)}`
      : '';

  const cutoutCard =
    seriesStatus === 'ready' && series && loaded && frame ? (
      <CutoutCarousel
        lang={lang}
        loaded={loaded}
        frameIndex={frameIndex}
        mode={mode}
        playing={playing}
        captionExtra={cutoutCap}
        onFrameChange={setFrameIndex}
        onPause={() => {
          setPlaying(false);
        }}
        asButton
        showHidden={showHidden}
        expandLabel={t(lang, 'expandCutout')}
        onExpand={() => {
          setCutoutOpen(true);
        }}
      />
    ) : (
      <div className="cutout-anchor" data-intro="cutout" aria-hidden="true" />
    );

  const featuredLayout = featured
    .map(entry => {
      const scr = featuredScreens[entry.id];
      if (!scr) return null;
      return { id: entry.id, x: scr.x, y: scr.y, entry };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const hideFeatLabels = featuredLabelVisibility(
    featuredLayout.map(m => ({ id: m.id, x: m.x, y: m.y })),
  );
  const globeMarkers = viewFov >= GLOBE_FOV_THRESHOLD;

  const semaforoInline = (
    <div className="semaforo-inline" aria-label="Interpretation levels">
      {(
        [
          ['OBSERVED', 'observed', 'observedTip'],
          ['EVALUATED', 'evaluated', 'evaluatedTip'],
          ['CONFIRMED', 'confirmed', 'confirmedTip'],
        ] as const
      ).map(([code, labelKey, tipKey]) => {
        const on = code === 'CONFIRMED' ? false : level === code;
        return (
          <HoverTip key={code} className={`semaforo-item${on ? ' on' : ''}`} dataOn={on} text={t(lang, tipKey)}>
            <i className="semaforo-dot" aria-hidden="true" />
            <span>{t(lang, labelKey)}</span>
          </HoverTip>
        );
      })}
    </div>
  );

  const changeExtras = (
    <>
      {isCustom && seriesStatus === 'ready' && series ? <p className="change-help">{t(lang, 'customHelp')}</p> : null}
      {seriesStatus === 'error' ? (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            if (lastLookup) loadSeries(lastLookup, selection.slug);
          }}
        >
          {t(lang, 'retry')}
        </button>
      ) : null}
    </>
  );

  const columnBody = (
    <>
      <button
        type="button"
        className="hero-title"
        onDoubleClick={() => {
          void returnToLastTarget();
        }}
      >
        {titleName}
      </button>
      {titleDesc ? <p className="hero-lead">{titleDesc}</p> : null}
      {featuredList}
      {catalogSearch}
      <div className="change-block" data-intro="change">
        <p className="change-title">{t(lang, 'whatChanged')}</p>
        <p className="change-line">{changeLine}</p>
        {measuredLine && pairCheck && seriesStatus === 'ready' ? <p className="change-help">{describePairCheck(lang, pairCheck)}</p> : null}
        {changeExtras}
        {semaforoInline}
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setDetailsOpen(true);
          }}
        >
          {t(lang, 'provenance')}
        </button>
      </div>
    </>
  );

  return (
    <div className={`viewer${mapOff || !engineOk ? ' map-off' : ''}${isMobile ? ' is-mobile' : ''}${introOpen && !introFlying ? ' tour-open' : ''}`}>
      <header className="chrome" role="banner" onPointerDown={stopUiBubble} onClick={stopUiBubble}>
        <a className="brand" href="/" aria-label={t(lang, 'brand')}>
          <img
            src={`${import.meta.env.BASE_URL}brand/copernix-wordmark.webp`}
            alt=""
            width={720}
            height={59}
            style={{ display: 'block', height: '12px', width: 'auto' }}
          />
        </a>
        <div className="chrome-right">
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
        </div>
      </header>

      <div className="sky-layer" aria-hidden={mapOff || !engineOk} data-intro="map">
        <canvas
          ref={canvasRef}
          className="sky-canvas"
          tabIndex={0}
          aria-label="Sky map"
          data-testid="sky-map"
        />
        <div className="sky-vignette" aria-hidden="true" />
        <div className="sky-scrim" aria-hidden="true" />
        {markerScreen ? (
          <div
            className="marker"
            data-testid="target-marker"
            style={{ left: markerScreen.x, top: markerScreen.y }}
            aria-hidden="true"
          >
            <span className="marker-dot" />
            <span className="marker-ring" />
            {titleName && selection.mode !== 'custom' ? (
              <span className="marker-label mono">{titleName}</span>
            ) : null}
          </div>
        ) : null}
        {featuredLayout.map(({ entry, x, y }) => {
          const active =
            (selection.mode === 'target' && selection.slug === entry.slug) ||
            (selection.mode === 'named' && selection.catalogName === entry.name);
          const dim = !globeMarkers && !active;
          const showLabel = !hideFeatLabels.has(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              className={`feat-marker${active ? ' active' : ''}${dim ? ' dim' : ''}`}
              style={{ left: x, top: y }}
              aria-label={entry.name}
              onPointerDown={stopUiBubble}
              onClick={e => {
                stopUiBubble(e);
                void selectEntry(entry);
              }}
            >
              <span className="marker-dot" aria-hidden="true" />
              <span className="marker-ring" aria-hidden="true" />
              {showLabel ? <span className="marker-label mono">{entry.name}</span> : null}
            </button>
          );
        })}
        {introFlying ? (
          <button
            type="button"
            className="text-link skip-intro-fly"
            onPointerDown={stopUiBubble}
            onClick={e => {
              stopUiBubble(e);
              skipIntroFlight();
            }}
          >
            {t(lang, 'skipIntroFly')}
          </button>
        ) : null}
        {candidateScreen && selection.candidate ? (
          <div
            className="candidate"
            data-testid="candidate-marker"
            style={{ left: candidateScreen.x, top: candidateScreen.y }}
          >
            <span className="candidate-cross" aria-hidden="true" />
            <span className="candidate-meta mono">
              {selection.candidate.ra.toFixed(4)}°, {selection.candidate.dec.toFixed(4)}°
            </span>
            <button
              type="button"
              className="text-link candidate-analyze"
              data-testid="analyze-candidate"
              onPointerDown={stopUiBubble}
              onClick={e => {
                stopUiBubble(e);
                void analyzeCandidate();
              }}
            >
              {t(lang, 'analyze')}
            </button>
          </div>
        ) : null}

        <div className="map-controls" onPointerDown={stopUiBubble} onClick={stopUiBubble}>
          <button
            type="button"
            className="zoom-btn"
            aria-label={t(lang, 'zoomInLabel')}
            onClick={() => {
              engineRef.current?.zoomBy(1 / 1.25);
              setMapHintVisible(false);
            }}
          >
            {t(lang, 'zoomIn')}
          </button>
          <button
            type="button"
            className="zoom-btn"
            aria-label={t(lang, 'zoomOutLabel')}
            onClick={() => {
              engineRef.current?.zoomBy(1.25);
              setMapHintVisible(false);
            }}
          >
            {t(lang, 'zoomOut')}
          </button>
          <button
            type="button"
            className="text-link center-btn"
            onClick={() => {
              void centerOnObject();
            }}
          >
            {t(lang, 'centerObject')}
          </button>
        </div>
        {mapHintVisible && !mapOff ? (
          <p className="map-hint mono" aria-hidden="true">
            {t(lang, 'mapHint')}
          </p>
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

      {!isMobile ? (
        <aside
          className={`left-col${introFlying ? ' entry-pending' : ' entry-visible'}`}
          aria-label={t(lang, 'targetsLabel')}
          onPointerDown={stopUiBubble}
          onClick={stopUiBubble}
        >
          {columnBody}
        </aside>
      ) : null}

      {!isMobile ? cutoutCard : null}

      {offerReturn && returnName ? (
        <button
          type="button"
          className={`text-link return-fab${isMobile ? '' : ' return-pill'}`}
          data-testid="return-to-target"
          onPointerDown={stopUiBubble}
          onClick={e => {
            stopUiBubble(e);
            void returnToLastTarget();
          }}
        >
          {returnLabel(lang, returnName)}
        </button>
      ) : null}

      <button
        type="button"
        className="text-link what-seeing"
        data-testid="reopen-intro"
        onPointerDown={stopUiBubble}
        onClick={e => {
          stopUiBubble(e);
          setIntroOpen(true);
        }}
      >
        {t(lang, 'whatAmISeeing')}
      </button>

      {isMobile ? (
        <aside
          className={`sheet glass-panel${sheetOpen ? ' open' : ''}`}
          aria-label={t(lang, 'whatChanged')}
          onPointerDown={stopUiBubble}
          onClick={stopUiBubble}
        >
          <button
            type="button"
            className="sheet-handle"
            aria-expanded={sheetOpen}
            onClick={() => {
              setSheetOpen(o => !o);
            }}
          >
            <span className="sheet-grip" aria-hidden="true" />
            <span className="sheet-title">{titleName || t(lang, 'whatChanged')}</span>
            <span className="sheet-line">{changeLine}</span>
            <span className="semaforo-dots" aria-hidden="true">
              <i data-on={level === 'OBSERVED'} />
              <i data-on={level === 'EVALUATED'} />
              <i data-on={false} />
            </span>
            <span className="sr-only">{sheetOpen ? t(lang, 'sheetCollapse') : t(lang, 'sheetExpand')}</span>
          </button>
          <div className="sheet-scroll">
            <div className="targets-scroll" role="toolbar" aria-label={t(lang, 'targetsLabel')}>
              {featured.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  className="object-link horizontal"
                  aria-pressed={selection.mode === 'target' && selection.slug === entry.slug}
                  onClick={() => {
                    void selectEntry(entry);
                  }}
                >
                  {entry.name}
                </button>
              ))}
            </div>
            {catalogSearch}
            {titleDesc ? <p className="hero-lead">{titleDesc}</p> : null}
            <div className="change-block">
              <p className="change-title">{t(lang, 'whatChanged')}</p>
              <p className="change-line">{changeLine}</p>
              {changeExtras}
              {semaforoInline}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setDetailsOpen(true);
                }}
              >
                {t(lang, 'provenance')}
              </button>
            </div>
            {cutoutCard}
          </div>
        </aside>
      ) : null}

      {detailsOpen ? (
        <div className="drawer-root" onPointerDown={stopUiBubble} onClick={stopUiBubble}>
          <button
            type="button"
            className="drawer-scrim"
            aria-label={t(lang, 'closeDrawer')}
            onClick={() => {
              setDetailsOpen(false);
            }}
          />
          <aside className="drawer glass-panel" aria-label={t(lang, 'provenance')}>
            <header className="drawer-head">
              <h2>{t(lang, 'provenance')}</h2>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setDetailsOpen(false);
                }}
              >
                {t(lang, 'closeDrawer')}
              </button>
            </header>
            <div className="drawer-scroll">{provenanceBody}</div>
          </aside>
        </div>
      ) : null}

      {cutoutOpen && seriesStatus === 'ready' && series && loaded && frame ? (
        <div className="modal-root" onPointerDown={stopUiBubble} onClick={stopUiBubble}>
          <button
            type="button"
            className="drawer-scrim"
            aria-label={t(lang, 'closeCutout')}
            onClick={() => {
              setCutoutOpen(false);
            }}
          />
          <div className="cutout-modal glass-panel" role="dialog" aria-modal="true">
            <header className="drawer-head">
              <h2>{t(lang, 'cutoutBeforeAfter')}</h2>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setCutoutOpen(false);
                }}
              >
                {t(lang, 'closeCutout')}
              </button>
            </header>
            <CutoutCarousel
              className=" cutout-carousel-modal"
              showHidden={showHidden}
              lang={lang}
              loaded={loaded}
              frameIndex={frameIndex}
              mode={mode}
              playing={playing}
              captionExtra={cutoutCap}
              onFrameChange={setFrameIndex}
              onPause={() => {
                setPlaying(false);
              }}
            />
          </div>
        </div>
      ) : null}

      <section className={`dock glass-panel${optionsOpen ? ' options-open' : ''}`} data-intro="dock" aria-label="Timeline" onPointerDown={stopUiBubble} onClick={stopUiBubble}>
        {showBands ? (
          <div className="dock-bands">
            <BandBars
              plane={plane}
              lang={lang}
              label={t(lang, 'band')}
              hint={t(lang, 'lightTypeHint')}
              onChange={v => {
                setPlane(v);
                engineRef.current?.setPlane(v);
                mapRef.current?.setPlane(v);
              }}
            />
          </div>
        ) : null}
        <div className="dock-row">
          <button
            type="button"
            className="pp pp-text"
            aria-label={playing ? t(lang, 'pause') : t(lang, 'play')}
            aria-pressed={playing}
            disabled={mode !== 'loop' || seriesStatus !== 'ready' || frameCount < 2}
            onClick={() => {
              setPlaying(p => !p);
              setMode('loop');
            }}
          >
            {playing ? t(lang, 'pause') : t(lang, 'play')}
          </button>
          <button
            type="button"
            className="photo-arrow dock-photo-arrow"
            aria-label={t(lang, 'photoPrev')}
            disabled={!loaded || frameCount < 2 || (!playing && frameIndex <= 0)}
            onClick={() => {
              if (!loaded) return;
              bumpFrame(prevBlinkIndex(frameIndex, loaded.frames.length));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
          </button>
          <button
            type="button"
            className="photo-arrow dock-photo-arrow"
            aria-label={t(lang, 'photoNext')}
            disabled={!loaded || frameCount < 2 || (!playing && frameIndex >= frameCount - 1)}
            onClick={() => {
              if (!loaded) return;
              bumpFrame(nextBlinkIndex(frameIndex, loaded.frames.length));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
          </button>
          {photoLabel ? <span className="photo-index mono">{photoLabel}</span> : null}
          <div className="timeline" role="list" ref={timelineRef}>
            <div className="timeline-track" />
            {timeline?.markers.map(m =>
              m.kind === 'frame' ? (
                <button
                  key={`f-${String(m.index)}`}
                  type="button"
                  className={`timeline-mark${m.index === frameIndex ? ' on' : ''}`}
                  style={{ left: `${String(m.fraction * 100)}%` }}
                  title={formatVisitDate(series?.frames[m.index]?.t_mid ?? m.label, lang)}
                  aria-label={formatVisitDate(series?.frames[m.index]?.t_mid ?? m.label, lang)}
                  aria-current={m.index === frameIndex ? 'true' : undefined}
                  onClick={() => {
                    setPlaying(false);
                    setFrameIndex(m.index);
                  }}
                >
                  <span
                    className={`timeline-date mono${visibleDateIndices.has(m.index) ? '' : ' is-muted'}`}
                    aria-hidden={!visibleDateIndices.has(m.index)}
                  >
                    {formatVisitDate(series?.frames[m.index]?.t_mid ?? m.label, lang)}
                  </span>
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
            {timeline && timelineWidth >= 200 && timeline.markers.some(m => m.kind === 'frame') ? (
              <>
                <span className="timeline-end left mono">{t(lang, 'oldest')}</span>
                <span className="timeline-end right mono">{t(lang, 'newest')}</span>
              </>
            ) : null}
          </div>
          <button
            type="button"
            className="dock-outline options-toggle"
            aria-expanded={optionsOpen}
            aria-controls="dock-options"
            onClick={() => {
              setOptionsOpen(o => !o);
            }}
          >
            {t(lang, 'viewOptions')}
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        </div>
        <div id="dock-options" className="dock-options" hidden={!optionsOpen}>
          <div className="seg-control" role="group" aria-label="View mode">
            {(
              [
                ['loop', 'modeLoop'],
                ['difference', 'modeDiff'],
                ['colour', 'modeColour'],
              ] as const
            ).map(([value, key]) => (
              <button
                key={value}
                type="button"
                className="seg-btn"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setPlaying(value === 'loop');
                  if (value === 'colour') setLightOpen(true);
                }}
              >
                {t(lang, key)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dock-outline colours-toggle"
            aria-pressed={lightOpen}
            onClick={() => {
              setLightOpen(o => !o);
            }}
          >
            <span className="wave-icon" aria-hidden="true">
              ∿
            </span>
            {t(lang, 'lightType')}
          </button>
          <p className="mode-help" aria-live="polite" data-testid="mode-help">
            {t(lang, modeHelpKey(mode))}
          </p>
        </div>
      </section>

      <div
        className="load-bar load-bar-busy"
        aria-hidden="true"
        data-active={seriesStatus === 'loading' || engineStatus.startsWith('Loading sky images')}
      />

      <IntroGuide
        lang={lang}
        open={introOpen}
        allowShow={!introFlying}
        onClose={() => {
          setIntroOpen(false);
        }}
      />

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
