export const BLINK_HZ_MIN = 0.5;
export const BLINK_HZ_MAX = 2.5;
export const BLINK_HZ_DEFAULT = 1;

export function clampBlinkHz(hz: number): number {
  if (!Number.isFinite(hz)) return BLINK_HZ_DEFAULT;
  return Math.min(BLINK_HZ_MAX, Math.max(BLINK_HZ_MIN, hz));
}

export function blinkIntervalMs(rateHz: number): number {
  return 1000 / clampBlinkHz(rateHz);
}

export function nextBlinkIndex(current: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return (current + 1) % frameCount;
}

export function prevBlinkIndex(current: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return (current - 1 + frameCount) % frameCount;
}
