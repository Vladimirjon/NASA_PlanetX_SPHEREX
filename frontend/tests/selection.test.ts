import { expect, it } from 'vitest';
import { selectOrder } from '../src/engine/core/tiles/selection';
it('increases order as zoom or screen resolution increases and caps it at five', () => {
  expect(selectOrder(360, 1280)).toBe(0);
  expect(selectOrder(1, 1280)).toBe(5);
  expect(selectOrder(10, 2560)).toBeGreaterThan(selectOrder(10, 640));
  expect(selectOrder(0.01, 10000)).toBe(5);
});
