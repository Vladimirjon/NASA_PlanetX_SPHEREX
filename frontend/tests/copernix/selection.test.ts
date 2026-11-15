import { describe, expect, it } from 'vitest';
import {
  angularSeparationDeg,
  createSelection,
  reduceSelection,
  samePoint,
  shouldOfferReturn,
  type SelectionState,
} from '../../copernix/src/selection';

const WISE = { ra: 133.7952573, dec: -7.245091 };
const RW = { ra: 76.9560812, dec: 30.40120459 };

function targetState(overrides: Partial<SelectionState> = {}): SelectionState {
  return {
    ...createSelection({
      mode: 'target',
      slug: 'wise-0855',
      coords: WISE,
    }),
    ...overrides,
  };
}

describe('samePoint / angularSeparationDeg', () => {
  it('treats identical coords as the same point', () => {
    expect(samePoint(WISE, { ...WISE })).toBe(true);
    expect(samePoint(WISE, RW)).toBe(false);
  });

  it('measures angular separation in degrees', () => {
    expect(angularSeparationDeg(WISE, WISE)).toBeLessThan(1e-6);
    expect(angularSeparationDeg(WISE, RW)).toBeGreaterThan(50);
  });
});

describe('select_named', () => {
  it('anchors a named catalog hit without a featured slug', () => {
    const next = reduceSelection(targetState(), {
      type: 'select_named',
      name: 'Proxima Centauri',
      coords: { ra: 217.4, dec: -62.6 },
      kind: 'Nearby star',
      description: 'Astronomical object',
    });
    expect(next.mode).toBe('named');
    expect(next.slug).toBeNull();
    expect(next.catalogName).toBe('Proxima Centauri');
    expect(next.coords.ra).toBeCloseTo(217.4);
    expect(next.lastTargetSlug).toBe('wise-0855');
    expect(next.candidate).toBeNull();
  });
});

describe('shouldOfferReturn', () => {
  it('is false when the view centre is near the anchor', () => {
    expect(shouldOfferReturn(WISE, WISE, 0.5)).toBe(false);
    expect(shouldOfferReturn(WISE, { ra: WISE.ra + 0.1, dec: WISE.dec }, 0.5)).toBe(false);
  });

  it('is true beyond ~1.5× FOV', () => {
    expect(shouldOfferReturn(WISE, { ra: WISE.ra + 1.0, dec: WISE.dec }, 0.5)).toBe(true);
  });
});

describe('reduceSelection', () => {
  it('select_target anchors the marker and clears any candidate', () => {
    const withCand = targetState({ candidate: { ra: 1, dec: 2 } });
    const next = reduceSelection(withCand, {
      type: 'select_target',
      slug: 'rw-aurigae',
      coords: RW,
    });
    expect(next).toEqual({
      mode: 'target',
      slug: 'rw-aurigae',
      catalogName: null,
      catalogKind: null,
      catalogDescription: null,
      coords: RW,
      lastTargetSlug: 'rw-aurigae',
      candidate: null,
    });
  });

  it('set_candidate never moves the anchored marker', () => {
    const before = targetState();
    const next = reduceSelection(before, {
      type: 'set_candidate',
      coords: { ra: 10, dec: 20 },
    });
    expect(next.coords).toEqual(WISE);
    expect(next.slug).toBe('wise-0855');
    expect(next.mode).toBe('target');
    expect(next.candidate).toEqual({ ra: 10, dec: 20 });
  });

  it('second click on the same candidate clears it', () => {
    const withCand = targetState({ candidate: { ra: 10, dec: 20 } });
    const next = reduceSelection(withCand, {
      type: 'set_candidate',
      coords: { ra: 10, dec: 20 },
    });
    expect(next.candidate).toBeNull();
    expect(next.coords).toEqual(WISE);
  });

  it('clear_candidate drops the ephemeral pick', () => {
    const withCand = targetState({ candidate: { ra: 1, dec: 2 } });
    expect(reduceSelection(withCand, { type: 'clear_candidate' }).candidate).toBeNull();
  });

  it('analyze_candidate promotes to custom without changing lastTargetSlug', () => {
    const withCand = targetState({ candidate: { ra: 12.5, dec: -3.25 } });
    const next = reduceSelection(withCand, { type: 'analyze_candidate' });
    expect(next.mode).toBe('custom');
    expect(next.slug).toBeNull();
    expect(next.coords).toEqual({ ra: 12.5, dec: -3.25 });
    expect(next.lastTargetSlug).toBe('wise-0855');
    expect(next.candidate).toBeNull();
  });

  it('analyze_candidate is a no-op without a candidate', () => {
    const before = targetState();
    expect(reduceSelection(before, { type: 'analyze_candidate' })).toBe(before);
  });

  it('set_custom keeps lastTargetSlug for return', () => {
    const next = reduceSelection(targetState(), {
      type: 'set_custom',
      coords: { ra: 1, dec: 2 },
    });
    expect(next.mode).toBe('custom');
    expect(next.slug).toBeNull();
    expect(next.lastTargetSlug).toBe('wise-0855');
  });

  it('return_to_target restores a challenge target', () => {
    const custom = reduceSelection(targetState(), {
      type: 'set_custom',
      coords: { ra: 1, dec: 2 },
    });
    const next = reduceSelection(custom, {
      type: 'return_to_target',
      slug: 'wise-0855',
      coords: WISE,
    });
    expect(next.mode).toBe('target');
    expect(next.slug).toBe('wise-0855');
    expect(next.coords).toEqual(WISE);
    expect(next.candidate).toBeNull();
  });
});
