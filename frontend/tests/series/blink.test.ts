import { describe, expect, it } from 'vitest';
import { blinkIntervalMs, clampBlinkHz, nextBlinkIndex } from '../../src/series/core/blink';

describe('clampBlinkHz', () => {
  it('clamps to 0.5–2.5 Hz (WCAG ≤ 2.5)', () => {
    expect(clampBlinkHz(0.1)).toBe(0.5);
    expect(clampBlinkHz(1)).toBe(1);
    expect(clampBlinkHz(3)).toBe(2.5);
    expect(clampBlinkHz(2.5)).toBe(2.5);
  });
});

describe('blinkIntervalMs', () => {
  it('uses the clamped rate', () => {
    expect(blinkIntervalMs(1)).toBe(1000);
    expect(blinkIntervalMs(10)).toBe(400);
  });
});

describe('nextBlinkIndex', () => {
  it('wraps around the frame count', () => {
    expect(nextBlinkIndex(0, 3)).toBe(1);
    expect(nextBlinkIndex(2, 3)).toBe(0);
  });
});
