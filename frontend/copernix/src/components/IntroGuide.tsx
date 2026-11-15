import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { markIntroSeen } from '../intro';
import { t, type Lang } from '../i18n';

type Props = {
  readonly lang: Lang;
  readonly open: boolean;
  readonly onClose: () => void;
  /** When false, intro stays hidden until entry flight ends. */
  readonly allowShow?: boolean;
};

type Step = {
  readonly anchor: string;
  readonly bodyKey: 'introStep1' | 'introStep2' | 'introStep3' | 'introStep4' | 'introStep5';
  /** Where the card sits next to the highlighted area on wide screens. */
  readonly side: 'inside' | 'right' | 'left' | 'above';
};

const STEPS: readonly Step[] = [
  { anchor: '[data-intro="map"]', bodyKey: 'introStep1', side: 'inside' },
  { anchor: '[data-intro="catalog"]', bodyKey: 'introStep2', side: 'right' },
  { anchor: '[data-intro="change"]', bodyKey: 'introStep3', side: 'right' },
  { anchor: '[data-intro="dock"]', bodyKey: 'introStep4', side: 'above' },
  { anchor: '[data-intro="cutout"]', bodyKey: 'introStep5', side: 'left' },
];

function ringRect(sel: string): DOMRect | null {
  const el = document.querySelector(sel);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export function IntroGuide({ lang, open, onClose, allowShow = true }: Props) {
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [never, setNever] = useState(false);
  const neverRef = useRef(false);
  neverRef.current = never;
  const finish = useCallback(() => {
    if (neverRef.current) markIntroSeen();
    onClose();
  }, [onClose]);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    const update = () => {
      setRect(ringRect(STEPS[step]?.anchor ?? ''));
    };
    update();
    window.addEventListener('resize', update);
    const id = window.setInterval(update, 400);
    return () => {
      window.removeEventListener('resize', update);
      window.clearInterval(id);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, finish]);

  if (!open || !allowShow) return null;

  const last = step >= STEPS.length - 1;
  const body = t(lang, STEPS[step]?.bodyKey ?? 'introStep1');

  const cardStyle: CSSProperties = (() => {
    const pad = 16;
    const narrow = window.innerWidth <= 820;
    const cardW = narrow ? Math.min(window.innerWidth - 32 - 56, 460) : Math.min(300, window.innerWidth - 24);
    const cardH = 190;
    const place = STEPS[step]?.side ?? 'inside';
    if (!rect) return { left: pad, top: narrow ? 72 : 120, width: cardW };
    if (narrow) {
      const dockTop = document.querySelector('.dock')?.getBoundingClientRect().top ?? window.innerHeight;
      const topUnderTitle = 96;
      if (place === 'above') return { left: pad, bottom: window.innerHeight - dockTop + 12, width: cardW };
      if (place === 'left') {
        return { left: pad, top: Math.max(topUnderTitle, Math.min(rect.top, dockTop - cardH - 12)), width: cardW };
      }
      return { left: pad, top: topUnderTitle, width: cardW };
    }
    const clampTop = (y: number) => Math.max(pad, Math.min(y, window.innerHeight - cardH - pad));
    const clampLeft = (x: number) => Math.max(pad, Math.min(x, window.innerWidth - cardW - pad));
    const dockTop = document.querySelector('.dock')?.getBoundingClientRect().top ?? window.innerHeight;
    const aboveDock = (left: number): CSSProperties => ({ left: clampLeft(left), bottom: window.innerHeight - dockTop + 12, width: cardW });
    switch (place) {
      case 'inside':
        return { left: clampLeft(rect.left + rect.width / 2 - cardW / 2), top: Math.max(80, rect.top + 20), width: cardW };
      case 'right':
        if (rect.top + cardH > dockTop - 10) return aboveDock(rect.right + 14);
        return { left: clampLeft(rect.right + 14), top: clampTop(rect.top), width: cardW };
      case 'above':
        return { left: clampLeft(rect.left + rect.width / 2 - cardW / 2), bottom: window.innerHeight - rect.top + 14, width: cardW };
      default:
        if (rect.top + cardH > dockTop - 10) return aboveDock(rect.left - cardW - 14);
        return { left: clampLeft(rect.left - cardW - 14), top: clampTop(rect.top), width: cardW };
    }
  })();

  return (
    <div className="intro-root" data-testid="intro-guide" aria-labelledby={titleId}>
      {rect ? (
        <div
          className="intro-ring"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div className="intro-card" role="dialog" aria-modal="false" style={cardStyle}>
        <p id={titleId} className="intro-body">
          {body}
        </p>
        <div className="intro-actions">
          <button
            type="button"
            className="text-link"
            onClick={finish}
          >
            {t(lang, 'introSkip')}
          </button>
          {last ? (
            <button
              type="button"
              className="go"
              onClick={finish}
            >
              {t(lang, 'introDone')}
            </button>
          ) : (
            <button
              type="button"
              className="go"
              onClick={() => {
                setStep(s => Math.min(STEPS.length - 1, s + 1));
              }}
            >
              {t(lang, 'introNext')}
            </button>
          )}
        </div>
        <label className="intro-never">
          <input
            type="checkbox"
            checked={never}
            onChange={e => {
              setNever(e.target.checked);
            }}
          />
          {t(lang, 'introNever')}
        </label>
        <p className="intro-step mono" aria-hidden="true">
          {String(step + 1)} / {String(STEPS.length)}
        </p>
      </div>
    </div>
  );
}
