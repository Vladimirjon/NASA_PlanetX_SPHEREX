import { describe, expect, it } from 'vitest';
import { D3_OBSERVATION_IDS, readD3Measurement } from '../../src/series/core/guided-pair';
import { parseAppSearch, toAppSearch } from '../../src/app/core/url-state';

const record = {
  case_ref: 'eps-indi-b-d3-pair',
  interpretation_ceiling: 'OBSERVED',
  observation_ids: D3_OBSERVATION_IDS,
  separation_arcsec: 6,
  delta_arcsec: [6, 0],
  sigma_delta_arcsec: [0.5, 0.5],
  source_revision: 'synthetic-test',
};

describe('guided D3 comparison', () => {
  it('only accepts the measured pair in frame order', () => {
    expect(readD3Measurement(record, D3_OBSERVATION_IDS)?.separation_arcsec).toBe(6);
    expect(readD3Measurement(record, [...D3_OBSERVATION_IDS].reverse())).toBeNull();
    expect(readD3Measurement(record, ['detector-d2-a', 'detector-d2-b'])).toBeNull();
  });

  it('rejects an upgraded interpretation or malformed measurement', () => {
    expect(readD3Measurement({ ...record, interpretation_ceiling: 'EVALUATED' }, D3_OBSERVATION_IDS)).toBeNull();
    expect(readD3Measurement({ ...record, separation_arcsec: 6.55 }, D3_OBSERVATION_IDS)).toBeNull();
    expect(readD3Measurement({ ...record, sigma_delta_arcsec: [null, 0.5] }, D3_OBSERVATION_IDS)).toBeNull();
  });

  it('only restores the guided pair from a named Epsilon Indi B link', () => {
    const parsed = parseAppSearch('?target=epsilon-indi-b&case=d3');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') expect(toAppSearch(parsed.state)).toBe('?target=epsilon-indi-b&case=d3');
    for (const query of ['?ra=331&dec=-56&case=d3', '?target=wise-0855&case=d3']) {
      const result = parseAppSearch(query);
      if (result.kind !== 'ok') throw new Error('Expected valid ordinary search');
      expect(toAppSearch(result.state)).not.toContain('case=d3');
    }
  });
});
