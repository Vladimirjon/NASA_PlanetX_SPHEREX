import { describe, expect, it } from 'vitest';
import {
  canonicalNameForSlug,
  CHALLENGE_TARGETS,
  slugFromName,
  targetBySlug,
} from '../../src/app/core/targets';

describe('challenge targets', () => {
  it('maps slugs to canonical resolve names', () => {
    expect(canonicalNameForSlug('barnards-star')).toBe("Barnard's Star");
    expect(canonicalNameForSlug('epsilon-indi-b')).toBe('Epsilon Indi B');
    expect(canonicalNameForSlug('wise-0855')).toBe('WISE 0855-0714');
    expect(canonicalNameForSlug('rw-aurigae')).toBe('RW Aurigae');
    expect(canonicalNameForSlug('r-draconis')).toBe('R Draconis');
  });

  it('lists exactly five challenge targets with plain descriptions', () => {
    expect(CHALLENGE_TARGETS).toHaveLength(5);
    for (const t of CHALLENGE_TARGETS) {
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.ra).toBeGreaterThanOrEqual(0);
      expect(t.dec).toBeGreaterThanOrEqual(-90);
    }
  });

  it('resolves slug from free-text name', () => {
    expect(slugFromName("Barnard's Star")).toBe('barnards-star');
    expect(slugFromName('eps indi b')).toBe('epsilon-indi-b');
    expect(targetBySlug('barnards-star')?.name).toBe("Barnard's Star");
  });
});
