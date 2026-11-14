import { describe, expect, it } from 'vitest';
import { parseAppSearch, toAppSearch } from '../../src/app/core/url-state';

describe('app URL state', () => {
  it('parses ?target=', () => {
    expect(parseAppSearch('?target=barnards-star')).toMatchObject({
      kind: 'ok',
      state: { target: 'barnards-star', mode: 'loop', t: 0 },
    });
  });

  it('parses ra/dec/fov/plane/t/mode', () => {
    const parsed = parseAppSearch('?ra=10.68&dec=41.27&fov=0.5&plane=20&t=2&mode=difference');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      expect(parsed.state.ra).toBeCloseTo(10.68);
      expect(parsed.state.dec).toBeCloseTo(41.27);
      expect(parsed.state.fov).toBeCloseTo(0.5);
      expect(parsed.state.plane).toBe(20);
      expect(parsed.state.t).toBe(2);
      expect(parsed.state.mode).toBe('difference');
    }
  });

  it('rejects invalid mode and out-of-range coords', () => {
    expect(parseAppSearch('?mode=blink').kind).toBe('invalid');
    expect(parseAppSearch('?ra=400&dec=0').kind).toBe('invalid');
  });

  it('round-trips target deep links', () => {
    const s = toAppSearch({
      target: 'epsilon-indi-b',
      ra: 331.07,
      dec: -56.79,
      fov: 0.5,
      plane: 0,
      t: 1,
      mode: 'colour',
      proj: 'SIN',
    });
    expect(s).toContain('target=epsilon-indi-b');
    expect(s).toContain('mode=colour');
    expect(s).toContain('t=1');
  });
});
