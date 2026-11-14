import { describe, expect, it } from 'vitest';
import { parseSeriesSearch, toSeriesSearch } from '../../src/series/core/url';

describe('parseSeriesSearch', () => {
  it('parses ?name=', () => {
    expect(parseSeriesSearch('?name=epsilon-indi-b')).toEqual({
      kind: 'name',
      name: 'epsilon-indi-b',
    });
  });

  it('parses ?ra=&dec=&fov=', () => {
    expect(parseSeriesSearch('?ra=269.45&dec=4.74&fov=5')).toEqual({
      kind: 'coords',
      ra: 269.45,
      dec: 4.74,
      fov: 5,
    });
  });

  it('rejects invalid coordinates', () => {
    const bad = parseSeriesSearch('?ra=400&dec=0&fov=5');
    expect(bad.kind).toBe('invalid');
  });

  it('returns empty for blank query', () => {
    expect(parseSeriesSearch('')).toEqual({ kind: 'empty' });
    expect(parseSeriesSearch('?')).toEqual({ kind: 'empty' });
  });
});

describe('toSeriesSearch', () => {
  it('round-trips name queries', () => {
    expect(toSeriesSearch({ kind: 'name', name: 'barnards-star' })).toBe('?name=barnards-star');
  });
});
