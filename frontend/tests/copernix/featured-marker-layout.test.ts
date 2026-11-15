import { describe, expect, it } from 'vitest';
import { featuredLabelVisibility } from '../../copernix/src/featured-marker-layout';

describe('featuredLabelVisibility', () => {
  it('hides label on the second marker when too close', () => {
    const hide = featuredLabelVisibility(
      [
        { id: 'a', x: 100, y: 100 },
        { id: 'b', x: 150, y: 100 },
      ],
      90,
    );
    expect(hide.has('b')).toBe(true);
    expect(hide.has('a')).toBe(false);
  });

  it('keeps both labels when far apart', () => {
    const hide = featuredLabelVisibility(
      [
        { id: 'a', x: 100, y: 100 },
        { id: 'b', x: 300, y: 200 },
      ],
      90,
    );
    expect(hide.size).toBe(0);
  });
});