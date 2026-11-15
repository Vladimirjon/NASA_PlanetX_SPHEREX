import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compassWord, describeMotionAnalysis, motionDetailRows, parseMotionAnalysis } from '../../copernix/src/analysis/motion-analysis';

const real: unknown = JSON.parse(readFileSync(new URL('../../public/demo/epsilon-indi-b/analysis-result.json', import.meta.url), 'utf8'));

describe('motion analysis (spec 0010 result)', () => {
  it('parses the real eps Indi B result', () => {
    const a = parseMotionAnalysis(real);
    expect(a).not.toBeNull();
    expect(a?.outcome).toBe('threshold_exceeded_unverified');
    expect(a?.ceiling).toBe('OBSERVED');
    expect(a?.separationArcsec).toBeCloseTo(6.55, 2);
    expect(a?.pmTotalArcsecPerYr).toBeCloseTo(4.626, 2);
    expect(a?.nVisits).toBe(4);
  });

  it('never states a measured change for an unverified outcome', () => {
    const a = parseMotionAnalysis(real);
    if (!a) throw new Error('fixture failed to parse');
    const es = describeMotionAnalysis('es', a, 'Epsilon Indi B') ?? '';
    const en = describeMotionAnalysis('en', a, 'Epsilon Indi B') ?? '';
    expect(es).toContain('6,6″');
    expect(es).toContain('sureste');
    expect(es).toContain('sin verificación independiente');
    expect(es).not.toMatch(/Medimos que/);
    expect(en).toContain('6.6″');
    expect(en).toContain('Not independently verified');
  });

  it('rejects synthetic or malformed results', () => {
    expect(parseMotionAnalysis({ ...(real as object), is_synthetic: true })).toBeNull();
    expect(parseMotionAnalysis({ ...(real as object), outcome: 'surely_moving' })).toBeNull();
    expect(parseMotionAnalysis(null)).toBeNull();
    expect(parseMotionAnalysis({})).toBeNull();
  });

  it('maps position angle to a compass word (north through east)', () => {
    expect(compassWord(0, 'es')).toBe('norte');
    expect(compassWord(122.4, 'es')).toBe('sureste');
    expect(compassWord(122.4, 'en')).toBe('southeast');
    expect(compassWord(350, 'en')).toBe('north');
  });

  it('lists the details with numbers from the file', () => {
    const a = parseMotionAnalysis(real);
    if (!a) throw new Error('fixture failed to parse');
    const rows = motionDetailRows('es', a);
    expect(rows.find(r => r.label === 'Pasadas usadas')?.value).toBe('4');
    expect(rows.some(r => r.value.includes('χ²'))).toBe(true);
  });
});
