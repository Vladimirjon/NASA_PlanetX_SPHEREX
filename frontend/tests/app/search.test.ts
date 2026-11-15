import { describe, expect, it } from 'vitest';
import { parseSearchQuery, searchApi } from '../../src/app/core/search';
import { vi } from 'vitest';

it('requests typeahead suggestions from the API', async () => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ name: 'M31', ra: 10, dec: 41 }])));
  expect(await searchApi('M31', new AbortController().signal, request)).toMatchObject([{ name: 'M31' }]);
  expect(request.mock.calls[0]?.[0]).toBe('/api/v1/search?q=M31&limit=10');
});

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

it('parses spaced sexagesimal coordinates with degree and arcminute symbols', () => {
  const result = parseSearchQuery('22h 03m 21.65s Dec -56° 47\' 09.52"');
  expect(result.kind).toBe('coords');
  if (result.kind !== 'coords') return;
  expect(result.ra).toBeCloseTo(330.8402083, 5);
  expect(result.dec).toBeCloseTo(-56.7859778, 5);
});

it('rejects out-of-range sexagesimal minutes and hours', () => {
  expect(parseSearchQuery('22h 63m 21s Dec -56° 47′ 09″').kind).toBe('invalid');
  expect(parseSearchQuery('24h 00m 00s Dec +00° 00′ 00″').kind).toBe('invalid');
});
