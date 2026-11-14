/** Honest progress copy for long-running series builds (8–20 s live). */

export type ProgressPhase = {
  readonly afterMs: number;
  readonly message: string;
};

export const SERIES_PROGRESS_PHASES: readonly ProgressPhase[] = [
  { afterMs: 0, message: 'Querying IRSA…' },
  { afterMs: 2500, message: 'Reading images from archive…' },
  { afterMs: 7000, message: 'Aligning visits to a common grid…' },
  { afterMs: 12000, message: 'Building the time series…' },
  { afterMs: 18000, message: 'Still working — first analysis can take up to ~20 s…' },
];

export function progressMessage(elapsedMs: number, phases: readonly ProgressPhase[] = SERIES_PROGRESS_PHASES): string {
  let msg = phases[0]?.message ?? 'Loading…';
  for (const p of phases) {
    if (elapsedMs >= p.afterMs) msg = p.message;
  }
  return msg;
}
