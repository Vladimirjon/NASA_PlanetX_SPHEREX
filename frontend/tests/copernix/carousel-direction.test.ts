import { describe, expect, it } from 'vitest';
import { carouselSlideDirection } from '../../copernix/src/carousel-direction';

describe('carouselSlideDirection', () => {
  it('steps forward when index increases', () => {
    expect(carouselSlideDirection(1, 2, 4, false)).toBe(1);
    expect(carouselSlideDirection(2, 1, 4, false)).toBe(-1);
  });

  it('wraps toward shorter path when playing', () => {
    expect(carouselSlideDirection(3, 0, 4, true)).toBe(1);
    expect(carouselSlideDirection(0, 3, 4, true)).toBe(-1);
  });
});