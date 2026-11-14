import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '../../src/app/core/search';

describe('parseSearchQuery', () => {
  it('recognises challenge names and slugs', () => {
    expect(parseSearchQuery("Barnard's Star")).toEqual({
      kind: 'target',
      slug: 'barnards-star',
    });
    expect(parseSearchQuery('barnards-star')).toEqual({
      kind: 'target',
      slug: 'barnards-star',
    });
  });

  it('parses decimal RA Dec', () => {
    expect(parseSearchQuery('269.45 4.74')).toEqual({
      kind: 'coords',
      ra: 269.45,
      dec: 4.74,
    });
    expect(parseSearchQuery('10.6847, 41.2690')).toEqual({
      kind: 'coords',
      ra: 10.6847,
      dec: 41.269,
    });
  });

  it('parses sexagesimal RA/Dec', () => {
    // 18h 00m 00s = 270°, +05° 00′ 00″
    const q = parseSearchQuery('18h00m00s +05d00m00s');
    expect(q.kind).toBe('coords');
    if (q.kind === 'coords') {
      expect(q.ra).toBeCloseTo(270, 5);
      expect(q.dec).toBeCloseTo(5, 5);
    }
  });

  it('treats other text as a free name for resolve', () => {
    expect(parseSearchQuery('M31')).toEqual({ kind: 'name', name: 'M31' });
  });

  it('rejects empty', () => {
    expect(parseSearchQuery('   ').kind).toBe('empty');
  });
});
