import { useEffect, useRef } from 'react';
import { CanvasSeriesRenderer, type ViewMode } from '../../series/adapters/canvas-renderer';
import { blinkIntervalMs, clampBlinkHz, nextBlinkIndex, prevBlinkIndex } from '../../series/core/blink';
import { COLOUR_LEGEND } from '../../series/core/colour';
import {
  DIAGONAL_MASK_NOTE,
  describeExpectedMotion,
  describeTimeSpan,
  describeWavelength,
  formatVisitLabel,
  motionProvenanceLabel,
} from '../../series/core/explain';
import { QUIET_LEGEND } from '../../series/core/hidden';
import { seriesStretchLimits } from '../../series/core/stretch';
import type { LoadedSeries } from '../../series/ports/series-source';
import { GuidedPairEvidence, GuidedPairSummary } from './guided-pair';
import { SegmentedControl } from './segmented-control';
import { Slider } from './slider';
import { Timeline } from './timeline';

type Props = {
  readonly open: boolean;
  readonly height: number;
  readonly onResize: (height: number) => void;
  readonly onClose: () => void;
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly progress: string | null;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly guidedPairOpen: boolean;
  readonly onOpenGuidedPair?: () => void;
  readonly onReturnToSeries: () => void;
  readonly loaded: LoadedSeries | null;
  readonly frameIndex: number;
  readonly setFrameIndex: (i: number | ((prev: number) => number)) => void;
  readonly playing: boolean;
  readonly setPlaying: (p: boolean) => void;
  readonly rateHz: number;
  readonly setRateHz: (hz: number) => void;
  readonly mode: ViewMode;
  readonly setMode: (m: ViewMode) => void;
  readonly targetSlug: string | null;
};

export function TimePanel(props: Props) {
  const {
    open,
    height,
    onResize,
    onClose,
    status,
    progress,
    error,
    onRetry,
    guidedPairOpen,
    onOpenGuidedPair,
    onReturnToSeries,
    loaded,
    frameIndex,
    setFrameIndex,
    playing,
    setPlaying,
    rateHz,
    setRateHz,
    mode,
    setMode,
    targetSlug,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasSeriesRenderer | null>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new CanvasSeriesRenderer(canvasRef.current);
    return () => { rendererRef.current = null; };
  }, [open, status]);

  useEffect(() => {
    if (!loaded || !rendererRef.current) return;
    const [h, w] = loaded.series.grid.shape;
    const limits = seriesStretchLimits(loaded.series.frames.map(f => f.stats));
    const frame = loaded.series.frames[Math.min(frameIndex, loaded.series.frames.length - 1)];
    rendererRef.current.render({
      mode,
      frameIndex,
      frames: loaded.frames,
      height: h,
      width: w,
      limits,
      grid: {
        shape: [h, w],
        crval_deg: [loaded.series.grid.crval_deg[0], loaded.series.grid.crval_deg[1]],
        pixel_scale_arcsec: loaded.series.grid.pixel_scale_arcsec,
      },
      predicted: frame.predicted_position ?? null,
      zoom: 6,
    });
  }, [loaded, frameIndex, mode, open, status]);

  useEffect(() => {
    if (!playing || mode !== 'loop' || !loaded) return;
    const count = loaded.frames.length;
    const id = window.setInterval(() => {
      setFrameIndex(i => nextBlinkIndex(i, count));
    }, blinkIntervalMs(rateHz));
    return () => {
      window.clearInterval(id);
    };
  }, [playing, mode, rateHz, loaded, setFrameIndex]);

  if (!open) return null;

  const series = status === 'ready' && loaded ? loaded.series : null;
  const frame =
    series && series.frames.length > 0
      ? series.frames[Math.min(frameIndex, series.frames.length - 1)]
      : null;
  const visitLabel =
    frame && series ? formatVisitLabel(frameIndex, series.frames.length, frame.t_mid) : 'No visit';
  const guidedPair = series && loaded?.guidedPair;
  const motion = series ? describeExpectedMotion(series) : null;
  const level = series ? series.comparability.level : null;

  return (
    <section
      className={guidedPairOpen ? 'time-panel guided-pair-panel' : 'time-panel'}
      style={{ height: guidedPairOpen ? `min(${String(height)}px, 68dvh)` : height }}
      aria-label="Time series analysis"
    >
      <div
        className="time-panel-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize time panel"
        tabIndex={0}
        onPointerDown={e => {
          dragRef.current = { startY: e.clientY, startH: height };
          const move = (ev: PointerEvent) => {
            if (!dragRef.current) return;
            const next = Math.min(720, Math.max(220, dragRef.current.startH - (ev.clientY - dragRef.current.startY)));
            onResize(next);
          };
          const up = () => {
            dragRef.current = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      />
      <header className="time-panel-bar">
        <h2>{guidedPairOpen ? 'Epsilon Indi B · D3' : 'Time series'}</h2>
        <span className="visit-label" data-testid="visit-label">
          {status === 'ready' ? visitLabel : status === 'loading' ? 'Loading…' : '—'}
        </span>
        <button type="button" className="btn" onClick={onClose} aria-label="Close time panel">
          Close
        </button>
      </header>

      {onOpenGuidedPair ? (
        <div className="guided-pair-navigation">
          <button
            type="button"
            className="btn"
            onClick={guidedPairOpen ? onReturnToSeries : onOpenGuidedPair}
          >
            {guidedPairOpen ? 'Back to time series' : 'Explore D3 comparison'}
          </button>
        </div>
      ) : null}
      {status === 'loading' ? (
        <div className="time-panel-status" role="status" data-testid="loading-progress">
          {progress ?? 'Loading series…'}
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="time-panel-status" role="alert">
          <p>{error}</p>
          <button type="button" className="btn primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {status === 'ready' && series && loaded ? (
        <div className="time-panel-body">
          <Timeline
            frames={series.frames}
            rejected={series.rejected.map(r => ({
              obs_id: r.obs_id,
              reason: r.reason,
              detail: r.detail,
            }))}
            currentIndex={frameIndex}
            onSelectIndex={i => {
              setPlaying(false);
              setFrameIndex(i);
            }}
          />
          <div className="time-panel-main">
            {guidedPair ? <GuidedPairSummary measurement={guidedPair} /> : null}
            <div className="cutout-stage">
              <canvas ref={canvasRef} tabIndex={0} role="img" aria-label={guidedPair ? `SPHEREx detector D3, ${visitLabel}, ${mode} view` : 'SPHEREx cutout on a common grid'} />
              {guidedPair && mode === 'colour' ? <p className="guided-pair-view-label">Magenta: image A · Green: image B</p> : null}
              {guidedPair && mode === 'difference' ? (
                <p className="guided-pair-view-label">Image {frameIndex === 0 ? 'A' : 'B'} minus image A · display contrast</p>
              ) : null}
              <div className="cutout-controls">
                <button
                  type="button"
                  className="btn primary"
                  aria-pressed={playing}
                  disabled={mode !== 'loop'}
                  onClick={() => {
                    setPlaying(!playing);
                  }}
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-label="Previous frame"
                  onClick={() => {
                    setPlaying(false);
                    setFrameIndex(prevBlinkIndex(frameIndex, loaded.frames.length));
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-label="Next frame"
                  onClick={() => {
                    setPlaying(false);
                    setFrameIndex(nextBlinkIndex(frameIndex, loaded.frames.length));
                  }}
                >
                  →
                </button>

                <Slider
                  label="Speed"
                  value={rateHz}
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  readout={`${rateHz.toFixed(1)} Hz`}
                  onChange={v => {
                    setRateHz(clampBlinkHz(v));
                  }}
                />
                <SegmentedControl
                  label="View mode"
                  value={mode}
                  options={[
                    { value: 'loop', label: 'Loop' },
                    { value: 'difference', label: 'Difference' },
                    { value: 'colour', label: 'Colour' },
                  ]}
                  onChange={m => {
                    setMode(m);
                    if (guidedPair && m === 'difference') setFrameIndex(1);
                    setPlaying(m === 'loop');
                  }}
                />
              </div>
            </div>
            <aside className="explain">
              {guidedPair ? <GuidedPairEvidence series={series} measurement={guidedPair} /> : <>
                {loaded.notice ? (
                  <div className="notice" role="status">
                    {loaded.notice}
                  </div>
                ) : (
                  <div className="notice live-ok" role="status">
                    Live series from API
                  </div>
                )}
                <h3>What you are looking at</h3>
                <p>{describeWavelength(series)}</p>
                <p>{describeTimeSpan(series.frames)}</p>
                {motion ? <p>{motion}</p> : null}
                {series.frames.length < 2 ? (
                  <p className="muted">Only one visit — not enough for a temporal comparison yet.</p>
                ) : null}
                <p className="muted">{QUIET_LEGEND}</p>
                <p className="muted">Dark edges: {DIAGONAL_MASK_NOTE}.</p>
                {mode === 'colour' ? <p className="muted">{COLOUR_LEGEND}</p> : null}
                <p className="muted">Ring: {motionProvenanceLabel(targetSlug ?? loaded.demoSlug)}</p>
                {level ? (
                  <>
                    <span className="badge" data-level={level}>
                      {level}
                    </span>
                    <p className="muted">
                      Software never assigns CONFIRMED.{' '}
                      {level === 'OBSERVED'
                        ? 'Images show an apparent difference.'
                        : 'Difference persists after quality controls.'}
                    </p>
                  </>
                ) : null}
                <details>
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
                <details>
                  <summary>Rejected images ({String(series.rejected.length)})</summary>
                  <ul className="check-list">
                    {series.rejected.map(r => (
                      <li key={r.obs_id}>
                        <strong>{r.reason}</strong>
                        <div className="muted">{r.detail}</div>
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Inspect (expert)</summary>
                  {frame ? (
                    <p className="mono">
                      λ={frame.wavelength_um.toFixed(5)} µm · D{String(frame.detector)} · {frame.unit}
                      <br />
                      Grid {String(series.grid.shape[0])}×{String(series.grid.shape[1])} · {series.grid.pixel_scale_arcsec}″/px
                    </p>
                  ) : null}
                </details>
                {frame ? (
                  <footer className="prov">
                    <div className="mono">
                      {frame.obs_id} · {frame.provenance.collection ?? 'n/a'} · {frame.t_mid.slice(0, 10)}
                    </div>
                    <a href={frame.provenance.source_url} target="_blank" rel="noreferrer">
                      IRSA access_url
                    </a>
                    <div>Data: NASA/JPL-Caltech/IPAC SPHEREx DR1 + QR3 via IRSA</div>
                  </footer>
                ) : null}
              </>}
            </aside>
          </div>
        </div>
      ) : null}
      {status === 'idle' ? (
        <div className="time-panel-status muted">Pick a challenge target or analyze a map region.</div>
      ) : null}
    </section>
  );
}
