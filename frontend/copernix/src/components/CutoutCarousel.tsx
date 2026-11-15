import { useEffect, useRef, useState } from 'react';
import { nextBlinkIndex, prevBlinkIndex } from '../../../src/series/core/blink';
import { countHidden, hiddenLayers } from '../../../src/series/core/hidden';
import { seriesStretchLimits } from '../../../src/series/core/stretch';
import type { LoadedSeries } from '../../../src/series/ports/series-source';
import type { ViewMode } from '../../../src/series/adapters/canvas-renderer';
import { carouselSlideDirection } from '../carousel-direction';
import { formatVisitDate } from '../light-label';
import { formatVisitLabelI18n } from '../explain-i18n';
import { t, type Lang } from '../i18n';
import { SeriesCutout } from './SeriesCutout';

type Props = {
  readonly lang: Lang;
  readonly loaded: LoadedSeries;
  readonly frameIndex: number;
  readonly mode: ViewMode;
  readonly playing: boolean;
  readonly captionExtra: string;
  readonly onFrameChange: (index: number) => void;
  readonly onPause: () => void;
  readonly className?: string;
  readonly asButton?: boolean;
  readonly onExpand?: () => void;
  readonly expandLabel?: string;
  /** Expert layer: hatch every hidden pixel instead of the quiet default. */
  readonly showHidden?: boolean;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CutoutCarousel({
  lang,
  loaded,
  frameIndex,
  mode,
  playing,
  captionExtra,
  onFrameChange,
  onPause,
  className = '',
  asButton = false,
  onExpand,
  expandLabel,
  showHidden = false,
}: Props) {
  const frameCount = loaded.series.frames.length;
  const prevIndexRef = useRef(frameIndex);
  const [slideDir, setSlideDir] = useState<0 | -1 | 1>(0);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev !== frameIndex) {
      setSlideDir(carouselSlideDirection(prev, frameIndex, frameCount, playing));
      prevIndexRef.current = frameIndex;
    }
  }, [frameIndex, frameCount, playing]);

  const frame = loaded.series.frames[Math.min(frameIndex, frameCount - 1)];
  const label = formatVisitLabelI18n(lang, frameIndex, frameCount, frame.t_mid);
  const [gridH, gridW] = loaded.series.grid.shape;
  const layers = hiddenLayers(
    mode,
    loaded.frames,
    frameIndex,
    seriesStretchLimits(loaded.series.frames.map(f => f.stats)),
    gridW,
    gridH,
  );
  const legend = showHidden && countHidden(layers.hidden) > 0 ? 'hidden' : countHidden(layers.bright) > 0 ? 'saturated' : null;
  const noDataNote = !showHidden && mode === 'difference' && countHidden(layers.hidden) > countHidden(layers.bright);
  const caption = `${t(lang, 'photoOf')} ${String(frameIndex + 1)} ${t(lang, 'photoOfOf')} ${String(frameCount)} · ${formatVisitDate(frame.t_mid, lang)}`;

  const goPrev = () => {
    onPause();
    onFrameChange(prevBlinkIndex(frameIndex, frameCount));
  };

  const goNext = () => {
    onPause();
    onFrameChange(nextBlinkIndex(frameIndex, frameCount));
  };

  const slideClass =
    slideDir === 0 || reduced
      ? ''
      : slideDir > 0
        ? ' slide-in-right'
        : ' slide-in-left';

  const inner = (
    <>
      <div className="cutout-carousel-row">
        <button
          type="button"
          className="photo-arrow"
          aria-label={t(lang, 'photoPrev')}
          disabled={!playing && frameIndex <= 0}
          onClick={e => {
            e.stopPropagation();
            goPrev();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div className={`cutout-stage${slideClass}`}>
          <SeriesCutout loaded={loaded} frameIndex={frameIndex} mode={mode} label={label} hiddenStyle={showHidden ? 'expert' : 'quiet'} />
        </div>
        <button
          type="button"
          className="photo-arrow"
          aria-label={t(lang, 'photoNext')}
          disabled={!playing && frameIndex >= frameCount - 1}
          onClick={e => {
            e.stopPropagation();
            goNext();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div className="carousel-dots" role="tablist" aria-label={caption}>
        {loaded.series.frames.map((_, i) => (
          <button
            key={String(i)}
            type="button"
            role="tab"
            className={`carousel-dot${i === frameIndex ? ' on' : ''}`}
            aria-selected={i === frameIndex}
            aria-label={`${t(lang, 'photoOf')} ${String(i + 1)}`}
            onClick={e => {
              e.stopPropagation();
              onPause();
              onFrameChange(i);
            }}
          />
        ))}
      </div>
      <p className="carousel-caption mono">{caption}</p>
      {captionExtra ? <p className="cutout-cap mono">{captionExtra}</p> : null}
      {legend ? (
        <p className="cutout-hidden-legend" data-testid="hidden-legend" data-legend={legend}>
          <span className={`hidden-swatch${legend === 'saturated' ? ' saturated' : ''}`} aria-hidden="true" />
          <span className="hidden-legend-long">{t(lang, legend === 'saturated' ? 'saturatedLegend' : 'hiddenLegend')}</span>
          <span className="hidden-legend-short">
            {t(lang, legend === 'saturated' ? 'saturatedLegendShort' : 'hiddenLegendShort')}
          </span>
        </p>
      ) : null}
      {noDataNote ? (
        <p className="cutout-hidden-legend" data-testid="no-data-legend">
          <span className="hidden-swatch no-data" aria-hidden="true" />
          <span>{t(lang, 'noDataLegend')}</span>
        </p>
      ) : null}
    </>
  );

  if (asButton && onExpand) {
    return (
      <button
        type="button"
        className={`cutout-card cutout-carousel${className}`}
        data-testid="cutout-card"
        data-intro="cutout"
        aria-label={expandLabel ?? t(lang, 'expandCutout')}
        onClick={onExpand}
      >
        {inner}
      </button>
    );
  }

  return <div className={`cutout-carousel${className ? ` ${className}` : ''}`}>{inner}</div>;
}