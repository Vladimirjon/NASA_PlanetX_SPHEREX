/** Timeline axis spanning SPHEREx DR1+QR3 coverage window used in the UI. */

export const TIMELINE_START_MS = Date.parse('2025-04-01T00:00:00Z');
export const TIMELINE_END_MS = Date.parse('2026-11-30T23:59:59Z');

export type TimelineFrame = {
  readonly index: number;
  readonly t_mid: string;
};

export type TimelineRejected = {
  readonly obs_id: string;
  readonly reason: string;
  readonly detail: string;
  readonly t_mid?: string;
};

export type TimelineMarker =
  | {
      readonly kind: 'frame';
      readonly index: number;
      readonly t_mid: string;
      readonly fraction: number;
      readonly label: string;
    }
  | {
      readonly kind: 'rejected';
      readonly obs_id: string;
      readonly reason: string;
      readonly detail: string;
      readonly fraction: number;
      readonly label: string;
    };

export type TimelineModel = {
  readonly markers: readonly TimelineMarker[];
  readonly yearTicks: readonly { readonly fraction: number; readonly label: string }[];
};

export function timeToFraction(ms: number): number {
  const span = TIMELINE_END_MS - TIMELINE_START_MS;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (ms - TIMELINE_START_MS) / span));
}

function dateLabel(iso: string): string {
  return iso.slice(0, 10);
}

export function buildTimeline(
  frames: readonly TimelineFrame[],
  rejected: readonly TimelineRejected[] = [],
): TimelineModel {
  const markers: TimelineMarker[] = [];
  for (const f of frames) {
    const ms = Date.parse(f.t_mid);
    if (!Number.isFinite(ms)) continue;
    markers.push({
      kind: 'frame',
      index: f.index,
      t_mid: f.t_mid,
      fraction: timeToFraction(ms),
      label: dateLabel(f.t_mid),
    });
  }
  for (const r of rejected) {
    const ms = r.t_mid ? Date.parse(r.t_mid) : Number.NaN;
    const fraction = Number.isFinite(ms)
      ? timeToFraction(ms)
      : markers.length > 0
        ? Math.min(1, (markers[markers.length - 1].fraction + 0.05))
        : 0.5;
    markers.push({
      kind: 'rejected',
      obs_id: r.obs_id,
      reason: r.reason,
      detail: r.detail,
      fraction,
      label: r.reason,
    });
  }
  markers.sort((a, b) => a.fraction - b.fraction);

  const yearTicks = [
    { fraction: timeToFraction(Date.parse('2025-04-01T00:00:00Z')), label: '2025-04' },
    { fraction: timeToFraction(Date.parse('2026-01-01T00:00:00Z')), label: '2026' },
    { fraction: timeToFraction(Date.parse('2026-11-01T00:00:00Z')), label: '2026-11' },
  ];

  return { markers, yearTicks };
}

export function nearestFrameIndex(fraction: number, markers: readonly TimelineMarker[]): number | null {
  let best: { index: number; d: number } | null = null;
  for (const m of markers) {
    if (m.kind !== 'frame') continue;
    const d = Math.abs(m.fraction - fraction);
    if (!best || d < best.d) best = { index: m.index, d };
  }
  return best?.index ?? null;
}
