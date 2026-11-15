import { useMemo, useRef } from 'react';
import { WAVELENGTHS } from '../../../src/engine/engine';
import { formatLightLabel } from '../light-label';
import type { Lang } from '../i18n';
import { Tip } from './Tip';
import { t } from '../i18n';

type Props = {
  readonly plane: number;
  readonly lang: Lang;
  readonly label: string;
  readonly hint: string;
  readonly onChange: (plane: number) => void;
};

function barHeight(i: number): string {
  return `${String(20 + 55 * Math.abs(Math.sin(i * 0.17) * Math.cos(i * 0.05)) + 10)}%`;
}

function barHue(i: number): string {
  return String((330 + i * 0.74) % 360);
}

export function BandBars({ plane, lang, label, hint, onChange }: Props) {
  const hold = useRef(false);
  const bars = useMemo(
    () =>
      Array.from({ length: 102 }, (_, i) => ({
        i,
        h: barHue(i),
        v: barHeight(i),
      })),
    [],
  );

  const fromEvent = (clientX: number, el: HTMLElement) => {
    const rc = el.getBoundingClientRect();
    const tFrac = (clientX - rc.left) / Math.max(1, rc.width);
    return Math.min(101, Math.max(0, Math.round(tFrac * 101)));
  };

  const lambda = WAVELENGTHS[plane] ?? WAVELENGTHS[0];
  const lightWords = formatLightLabel(lambda, lang);

  return (
    <div className="band-block">
      <p className="band-hint">{hint}</p>
      <div
        className="bars"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={101}
        aria-valuenow={plane}
        aria-valuetext={lightWords}
        onPointerDown={e => {
          hold.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          onChange(fromEvent(e.clientX, e.currentTarget));
        }}
        onPointerMove={e => {
          if (e.pointerType === 'mouse' || hold.current) {
            hold.current = true;
            onChange(fromEvent(e.clientX, e.currentTarget));
          }
        }}
        onPointerUp={() => {
          hold.current = false;
        }}
        onPointerCancel={() => {
          hold.current = false;
        }}
        onKeyDown={e => {
          const step: Record<string, number> = {
            ArrowLeft: -1,
            ArrowDown: -1,
            ArrowRight: 1,
            ArrowUp: 1,
            PageDown: -10,
            PageUp: 10,
          };
          if (e.key === 'Home') {
            e.preventDefault();
            onChange(0);
            return;
          }
          if (e.key === 'End') {
            e.preventDefault();
            onChange(101);
            return;
          }
          const d = step[e.key];
          if (d) {
            e.preventDefault();
            onChange(Math.min(101, Math.max(0, plane + d)));
          }
        }}
      >
        {bars.map(b => {
          const d = Math.abs(b.i - plane);
          const cls = d === 0 ? 'on' : d < 4 ? 'near' : '';
          return <i key={b.i} className={cls} style={{ ['--h' as string]: b.h, ['--v' as string]: b.v }} />;
        })}
      </div>
      <div className="band-meta">
        <span className="band-words">
          {lightWords}
          <Tip title={t(lang, 'tipMicronTitle')} body={t(lang, 'tipMicronBody')} aboutLabel={t(lang, 'about')} />
        </span>
      </div>
    </div>
  );
}
