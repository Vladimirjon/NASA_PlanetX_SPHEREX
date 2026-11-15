import { useEffect, useId, useState, type CSSProperties } from 'react';
import { markIntroSeen } from '../intro';
import { t, type Lang } from '../i18n';

type Props = {
  readonly lang: Lang;
  readonly open: boolean;
  readonly onClose: () => void;
};

type Step = {
  readonly anchor: string;
  readonly bodyKey: 'introStep1' | 'introStep2' | 'introStep3';
};

const STEPS: readonly Step[] = [
  { anchor: '[data-intro="map"]', bodyKey: 'introStep1' },
  { anchor: '[data-intro="catalog"]', bodyKey: 'introStep2' },
  { anchor: '[data-intro="cutout"]', bodyKey: 'introStep3' },
];

function ringRect(sel: string): DOMRect | null {
  const el = document.querySelector(sel);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export function IntroGuide({ lang, open, onClose }: Props) {
  const titleId = useId();
  const [step, setStep] = useState(0);
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
        markIntroSeen();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const last = step >= STEPS.length - 1;
  const body = t(lang, STEPS[step]?.bodyKey ?? 'introStep1');

  const cardStyle: CSSProperties = (() => {
    const pad = 12;
    const narrow = window.innerWidth <= 820;
    const cardW = narrow ? Math.min(248, window.innerWidth - 156) : Math.min(280, window.innerWidth - 24);
    if (!rect) return { left: pad, top: 120, width: cardW };
    switch (step) {
      case 0:
        if (narrow) {
          return {
            left: pad,
            top: Math.max(80, rect.top + Math.min(rect.height * 0.32, 200)),
            width: cardW,
          };
        }
        return {
          left: Math.min(window.innerWidth - cardW - pad, Math.max(pad, rect.left + rect.width / 2 - cardW / 2)),
          top: Math.max(80, rect.top + 20),
          width: cardW,
        };
      case 1:
        return {
          left: Math.min(window.innerWidth - cardW - pad, rect.right + 14),
          top: Math.max(pad, Math.min(rect.top, window.innerHeight - 200)),
        };
      default:
        return {
          left: Math.max(pad, rect.left - cardW - 14),
          top: Math.max(pad, Math.min(rect.top, window.innerHeight - 200)),
        };
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
            onClick={() => {
              markIntroSeen();
              onClose();
            }}
          >
            {t(lang, 'introSkip')}
          </button>
          {last ? (
            <button
              type="button"
              className="go"
              onClick={() => {
                markIntroSeen();
                onClose();
              }}
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
        <p className="intro-step mono" aria-hidden="true">
          {String(step + 1)} / {String(STEPS.length)}
        </p>
      </div>
    </div>
  );
}
