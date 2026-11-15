import { describe, expect, it } from 'vitest';
import {
  describeExpectedMotionI18n,
  describeTimeSpanI18n,
  describeWavelengthI18n,
  extractExplainNumbers,
  formatVisitLabelI18n,
  localizeEngineStatus,
  motionProvenanceI18n,
  wavelengthFacts,
} from '../../copernix/src/explain-i18n';
import type { components } from '../../src/api/schema';

type Series = components['schemas']['Series'];

const prov = {
  source_url: 'https://example.test',
  collection: 'DR1',
  retrieved_at: '2025-11-01T00:00:00Z',
  cache_layer: 'origin' as const,
};

function stubSeries(overrides: Partial<Series> = {}): Series {
  return {
    series_id: 's1',
    target: { ra: 10, dec: 20 },
    fov_arcmin: 5,
    detector: 1,
    reference_wavelength_um: 0.968,
    wavelength_tolerance_nm: 6.5,
    grid: {
      shape: [49, 49],
      crval_deg: [10, 20],
      pixel_scale_arcsec: 6.15,
      projection: 'TAN',
    },
    frames: [
      {
        index: 0,
        visit_id: 'v0',
        obs_id: 'o0',
        t_mid: '2025-05-01T00:00:00Z',
        wavelength_um: 0.968,
        detector: 1,
        unit: 'MJy/sr',
        data_url: '/f0.bin',
        stats: { p01: 0, p50: 0.5, p99: 1, masked_fraction: 0 },
        provenance: prov,
        predicted_position: { ra: 10, dec: 20 },
      },
      {
        index: 1,
        visit_id: 'v1',
        obs_id: 'o1',
        t_mid: '2025-11-01T00:00:00Z',
        wavelength_um: 0.968,
        detector: 1,
        unit: 'MJy/sr',
        data_url: '/f1.bin',
        stats: { p01: 0, p50: 0.5, p99: 1, masked_fraction: 0 },
        provenance: prov,
        predicted_position: { ra: 10.001, dec: 20.001 },
      },
    ],
    rejected: [],
    comparability: { level: 'OBSERVED', checks: [] },
    provenance: prov,
    ...overrides,
  };
}

describe('extractExplainNumbers', () => {
  it('pulls λ, detector, tolerance, years and motion from English explain text', () => {
    const text = [
      'Infrared light at 0.968 µm (detector D1), the same colour in every frame within 6.5 nm',
      '0.5 years between first and last image',
      'Expected motion ≈ 0.8 px (5.0″); SPHEREx pixel = 6.15″',
    ].join('. ');
    const n = extractExplainNumbers(text);
    expect(n.wavelengthUm).toBe(0.968);
    expect(n.detector).toBe(1);
    expect(n.toleranceNm).toBe(6.5);
    expect(n.years).toBe(0.5);
    expect(n.motionPx).toBe(0.8);
    expect(n.motionArcsec).toBe(5.0);
    expect(n.pixelScaleArcsec).toBe(6.15);
  });

  it('returns nulls when text has no numbers', () => {
    const n = extractExplainNumbers('nothing useful here');
    expect(n.wavelengthUm).toBeNull();
    expect(n.detector).toBeNull();
    expect(n.years).toBeNull();
  });
});

describe('describe*I18n', () => {
  it('keeps the same numbers in ES and EN wavelength phrases', () => {
    const series = stubSeries();
    const facts = wavelengthFacts(series);
    expect(facts.wavelengthUm).toBe(0.968);
    expect(facts.detector).toBe(1);
    expect(facts.toleranceNm).toBe(6.5);
    const es = describeWavelengthI18n('es', series);
    const en = describeWavelengthI18n('en', series);
    expect(es).toContain('0.968 µm');
    expect(es).toContain('D1');
    expect(es).toContain('6.5 nm');
    expect(es.startsWith('Luz infrarroja')).toBe(true);
    expect(en).toContain('0.968 µm');
    expect(en.startsWith('Infrared light')).toBe(true);
  });

  it('localizes time span and motion with shared figures', () => {
    const series = stubSeries();
    const esSpan = describeTimeSpanI18n('es', series.frames);
    const enSpan = describeTimeSpanI18n('en', series.frames);
    expect(esSpan).toMatch(/\d+\.\d+ años/);
    expect(enSpan).toMatch(/\d+\.\d+ years/);
    const esMot = describeExpectedMotionI18n('es', series);
    const enMot = describeExpectedMotionI18n('en', series);
    expect(esMot).toMatch(/≈ \d+\.\d+ px/);
    expect(esMot).toContain('6.15″');
    expect(enMot).toContain('6.15″');
    expect(esMot).toMatch(/píxel SPHEREx/);
  });

  it('formats visit labels and provenance', () => {
    expect(formatVisitLabelI18n('es', 0, 3, '2025-05-01T12:00:00Z')).toBe(
      'Visita 1 de 3 · 2025-05-01',
    );
    expect(formatVisitLabelI18n('en', 0, 3, '2025-05-01T12:00:00Z')).toBe(
      'Visit 1 of 3 · 2025-05-01',
    );
    expect(motionProvenanceI18n('es', 'wise-0855')).toContain('Luhman');
    expect(motionProvenanceI18n('es', 'barnards-star')).toContain('Gaia');
  });
});

describe('localizeEngineStatus', () => {
  it('translates IRSA tile progress to Spanish', () => {
    expect(localizeEngineStatus('es', 'Loading sky images from IRSA… 18 ready')).toBe(
      'Cargando imágenes del cielo desde IRSA… 18 listas',
    );
    expect(localizeEngineStatus('en', 'Loading sky images from IRSA… 18 ready')).toBe(
      'Loading sky images from IRSA… 18 ready',
    );
  });
});
