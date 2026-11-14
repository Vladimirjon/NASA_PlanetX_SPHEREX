import { useRef } from 'react';
import { buildTimeline, nearestFrameIndex, type TimelineRejected } from '../core/timeline';

type FrameLike = { readonly index: number; readonly t_mid: string };

type Props = {
  readonly frames: readonly FrameLike[];
  readonly rejected?: readonly TimelineRejected[];
  readonly currentIndex: number;
  readonly onSelectIndex: (index: number) => void;
};

export function Timeline({ frames, rejected = [], currentIndex, onSelectIndex }: Props) {
  const model = buildTimeline(frames, rejected);
  const trackRef = useRef<HTMLDivElement>(null);

  const fractionFromEvent = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  return (
    <div className="timeline" aria-label="Temporal change line">
      <div className="timeline-label">Temporal change · 2025-04 → 2026-11</div>
      <div
        className="timeline-track"
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, frames.length - 1)}
        aria-valuenow={currentIndex}
        aria-valuetext={frames[currentIndex] ? frames[currentIndex].t_mid.slice(0, 10) : 'none'}
        onKeyDown={e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onSelectIndex(Math.min(frames.length - 1, currentIndex + 1));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onSelectIndex(Math.max(0, currentIndex - 1));
          }
        }}
        onPointerDown={e => {
          const idx = nearestFrameIndex(fractionFromEvent(e.clientX), model.markers);
          if (idx !== null) onSelectIndex(idx);
          const move = (ev: PointerEvent) => {
            const i = nearestFrameIndex(fractionFromEvent(ev.clientX), model.markers);
            if (i !== null) onSelectIndex(i);
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      >
        <div className="timeline-axis" />
        {model.yearTicks.map(t => (
          <span key={t.label} className="timeline-year" style={{ left: `${t.fraction * 100}%` }}>
            {t.label}
          </span>
        ))}
        {model.markers.map(m =>
          m.kind === 'frame' ? (
            <button
              key={`f-${String(m.index)}`}
              type="button"
              className={m.index === currentIndex ? 'tl-mark solid is-current' : 'tl-mark solid'}
              style={{ left: `${m.fraction * 100}%` }}
              title={`Visit ${String(m.index + 1)} · ${m.label}`}
              aria-label={`Visit ${String(m.index + 1)} on ${m.label}`}
              aria-current={m.index === currentIndex ? 'true' : undefined}
              onClick={() => {
                onSelectIndex(m.index);
              }}
            />
          ) : (
            <span
              key={`r-${m.obs_id}`}
              className="tl-mark hollow"
              style={{ left: `${m.fraction * 100}%` }}
              title={`Rejected: ${m.reason} — ${m.detail}`}
            />
          ),
        )}
      </div>
    </div>
  );
}
