import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeChangeLineI18n } from '../../copernix/src/explain-i18n';
import { describePairCheck, parsePairCheck } from '../../copernix/src/analysis/motion-analysis';
import type { components } from '../../src/api/schema';

type Series = components['schemas']['Series'];

const demo = (slug: string): Series =>
  JSON.parse(readFileSync(new URL(`../../public/demo/${slug}/series.json`, import.meta.url), 'utf8')) as Series;

// Region review (docs/reviews/regions/2026-11-14-cinco-regiones.md): never state a shift or a
// brightness change that was not measured in these images.
describe('honest "What changed?" line', () => {
  const slugs = ['barnards-star', 'wise-0855', 'rw-aurigae', 'r-draconis'] as const;

  it.each(slugs)('%s never claims an unmeasured change', slug => {
    for (const lang of ['en', 'es'] as const) {
      const line = describeChangeLineI18n(lang, demo(slug), 'X', { slug });
      expect(line).not.toMatch(/shifted by|se desplazó|its brightness changes\.|su brillo cambia\./);
    }
  });

  it('explains saturation for Barnard and hidden pixels for RW Aur', () => {
    expect(describeChangeLineI18n('en', demo('barnards-star'), 'X', { slug: 'barnards-star' })).toMatch(/saturated/);
    expect(describeChangeLineI18n('en', demo('rw-aurigae'), 'X', { slug: 'rw-aurigae' })).toMatch(/do not establish a brightness change/);
    expect(describeChangeLineI18n('es', demo('wise-0855'), 'X', { slug: 'wise-0855' })).toMatch(/demasiado débil/);
  });

  it('falls back to a neutral sentence for any other region', () => {
    const line = describeChangeLineI18n('en', demo('barnards-star'), 'Vega', { slug: null });
    expect(line).toBe('A visual difference may be visible. Its cause has not been established.');
  });
});

describe('D3 two-image check (spec 0038 guided case)', () => {
  const caseJson: unknown = JSON.parse(readFileSync(new URL('../../public/demo/epsilon-indi-b-d3/case.json', import.meta.url), 'utf8'));
  const series = demo('epsilon-indi-b-d3');

  it('accepts only the exact D3 pair and keeps it a candidate', () => {
    const check = parsePairCheck(caseJson, series);
    if (!check) throw new Error('D3 case failed to parse');
    expect(check.separation_arcsec).toBeCloseTo(6.05, 2);
    expect(describePairCheck('en', check)).toMatch(/6\.05″.*parallax.*motion candidate/);
    expect(describePairCheck('es', check)).toMatch(/6,05″.*paralaje.*candidato/);
  });

  it('rejects a tampered result', () => {
    expect(parsePairCheck({ ...(caseJson as object), interpretation_ceiling: 'CONFIRMED' }, series)).toBeNull();
  });
});
