import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../i18n';
import type { JourneyHandle } from './journey-scene';

const CAPTIONS: Record<Lang, readonly string[]> = {
  en: [
    'SPHEREx · 700 km above Earth',
    'Leaving Earth',
    'The Sun and Earth’s orbit · glow added for visibility',
    'The Milky Way, as seen from the Solar System',
  ],
  es: [
    'SPHEREx · a 700 km de la Tierra',
    'Dejando la Tierra',
    'El Sol y la órbita de la Tierra · brillo añadido para verlos',
    'La Vía Láctea, vista desde el Sistema Solar',
  ],
};

/** Give up on the journey (straight to the sky) if its assets are not ready in time. */
const LOAD_BUDGET_MS = 9000;

/** QA only: `?journeyAt=0.45` freezes the journey at that progress for screenshots. */
function qaFreezeAt(search: string): number | null {
  const raw = new URLSearchParams(search).get('journeyAt');
  if (raw === null) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}

export const JOURNEY_ASSETS = {
  modelUrl: '/model/spherex.gltf',
  earthDayUrl: '/viewer/journey/earth-day.webp',
  earthNightUrl: '/viewer/journey/earth-night.webp',
  milkyWayUrl: '/viewer/journey/milkyway.webp',
} as const;

type Props = {
  readonly lang: Lang;
  readonly skipLabel: string;
  /** Called once: when the overlay has faded out, was skipped, or could not start. */
  readonly onDone: () => void;
};

/**
 * Entry journey overlay: satellite → Earth → Sun → Milky Way, ending on the same
 * galactic-centre view the Copernix globe starts from, then fading into it.
 */
export function Journey({ lang, skipLabel, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<JourneyHandle | null>(null);
  const doneRef = useRef(onDone);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'playing'>('loading');
  const [caption, setCaption] = useState(0);
  const [freezeAt] = useState(() => qaFreezeAt(window.location.search));
  doneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      handleRef.current?.dispose();
      handleRef.current = null;
      doneRef.current();
    };
    const canvas = canvasRef.current;
    if (!canvas) {
      finish();
      return undefined;
    }
    const budget = window.setTimeout(() => {
      if (!handleRef.current) {
        cancelled = true;
        finish();
      }
    }, LOAD_BUDGET_MS);
    void import('./journey-scene')
      .then(m => m.prepareJourney(canvas, JOURNEY_ASSETS, f => {
          if (!cancelled) setProgress(f);
        }),
      )
      .then(async handle => {
        window.clearTimeout(budget);
        if (cancelled) {
          handle.dispose();
          return;
        }
        handleRef.current = handle;
        setProgress(1);
        setPhase('playing');
        let lastCaption = -1;
        await handle.play(pose => {
          if (rootRef.current) rootRef.current.style.opacity = pose.overlay.toFixed(3);
          if (pose.caption !== lastCaption) {
            lastCaption = pose.caption;
            setCaption(pose.caption);
          }
        }, freezeAt);
        finish();
      })
      .catch(() => {
        window.clearTimeout(budget);
        finish();
      });
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cancelled = true;
        if (handleRef.current) handleRef.current.skip();
        else finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.clearTimeout(budget);
      window.removeEventListener('keydown', onKey);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  const skip = (): void => {
    if (handleRef.current) handleRef.current.skip();
    else doneRef.current();
  };

  return (
    <div ref={rootRef} className={`journey journey-${phase}`} aria-hidden={false} role="presentation">
      <canvas ref={canvasRef} className="journey-canvas" aria-hidden="true" />
      <div
        className="load-bar"
        role="progressbar"
        aria-label={lang === 'es' ? 'Cargando el recorrido' : 'Loading the journey'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        data-done={phase === 'playing'}
        style={{ transform: `scaleX(${String(Math.max(0.04, progress))})` }}
      />
      {phase === 'playing' ? (
        <p key={caption} className="journey-caption mono" aria-live="polite">
          {CAPTIONS[lang][caption]}
        </p>
      ) : null}
      <button type="button" className="text-link journey-skip" onClick={skip}>
        {skipLabel}
      </button>
    </div>
  );
}
