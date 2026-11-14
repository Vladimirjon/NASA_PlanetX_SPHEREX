export type FrameStatsLike = {
  readonly p01: number;
  readonly p50: number;
  readonly p99: number;
  readonly masked_fraction: number;
};

export type StretchLimits = {
  readonly lo: number;
  readonly hi: number;
};

const DEFAULT_SOFT = 10;

/** Shared stretch limits for the whole series (never per-frame normalisation). */
export function seriesStretchLimits(stats: readonly FrameStatsLike[]): StretchLimits {
  if (stats.length === 0) {
    throw new Error('seriesStretchLimits requires at least one frame stats');
  }
  let lo = stats[0].p01;
  let hi = stats[0].p99;
  for (let i = 1; i < stats.length; i += 1) {
    lo = Math.min(lo, stats[i].p01);
    hi = Math.max(hi, stats[i].p99);
  }
  return { lo, hi };
}

export function asinhStretch(value: number, lo: number, hi: number, soft: number = DEFAULT_SOFT): number {
  if (!Number.isFinite(value)) return Number.NaN;
  if (!(hi > lo)) return 0;
  const t = (value - lo) / (hi - lo);
  const y = Math.asinh(soft * t) / Math.asinh(soft);
  if (!Number.isFinite(y)) return Number.NaN;
  return Math.min(1, Math.max(0, y));
}

export function stretchFrame(data: Float32Array, limits: StretchLimits, soft: number = DEFAULT_SOFT): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = asinhStretch(data[i], limits.lo, limits.hi, soft);
  }
  return out;
}

/** Symmetric asinh stretch for a difference image, centred on zero. */
export function stretchDifference(data: Float32Array, absLimit: number, soft: number = DEFAULT_SOFT): Float32Array {
  const out = new Float32Array(data.length);
  const lim = Math.max(absLimit, Number.EPSILON);
  for (let i = 0; i < data.length; i += 1) {
    const v = data[i];
    if (!Number.isFinite(v)) {
      out[i] = Number.NaN;
      continue;
    }
    const t = v / lim;
    const y = Math.asinh(soft * t) / Math.asinh(soft);
    out[i] = Math.min(1, Math.max(-1, y));
  }
  return out;
}

export function differenceAbsLimit(data: Float32Array): number {
  let maxAbs = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = data[i];
    if (!Number.isFinite(v)) continue;
    maxAbs = Math.max(maxAbs, Math.abs(v));
  }
  return maxAbs === 0 ? 1 : maxAbs;
}
