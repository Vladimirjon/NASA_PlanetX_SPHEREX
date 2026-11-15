import { describe, expect, it } from 'vitest';
import {
  GALACTIC_CENTER,
  JOURNEY_MS,
  eqVec,
  gmstDeg,
  journeyPose,
  sunRaDec,
} from '../../copernix/src/journey/journey-math';

const close = (a: number, b: number, tol: number) => {
  expect(Math.abs(a - b)).toBeLessThan(tol);
};

describe('journey astronomy', () => {
  it('places the Sun near the equinox on 2026-03-20', () => {
    const s = sunRaDec(new Date('2026-03-20T14:46:00Z'));
    close(((s.ra + 180) % 360) - 180, 0, 0.5);
    close(s.dec, 0, 0.3);
  });

  it('places the Sun in Libra/Scorpius in mid-November (Astronomical Almanac formula)', () => {
    const s = sunRaDec(new Date('2026-11-14T12:00:00Z'));
    close(s.ra, 229.9, 1);
    close(s.dec, -18.3, 0.6);
  });

  it('maps RA/Dec to the sky-sphere frame used by the Milky Way map', () => {
    const [x, y, z] = eqVec(90, 0);
    close(x, 0, 1e-9);
    close(y, 0, 1e-9);
    close(z, -1, 1e-9);
    close(eqVec(0, 90)[1], 1, 1e-9);
  });

  it('computes Greenwich mean sidereal time at J2000', () => {
    close(gmstDeg(new Date('2000-01-01T12:00:00Z')), 280.46, 0.01);
  });

  it('targets the galactic centre', () => {
    close(GALACTIC_CENTER.ra, 266.405, 0.01);
    close(GALACTIC_CENTER.dec, -28.936, 0.01);
  });
});

describe('journey timeline', () => {
  it('pulls the camera out monotonically from metres to astronomical units', () => {
    let prev = 0;
    for (let ms = 0; ms <= JOURNEY_MS; ms += 50) {
      const p = journeyPose(ms / JOURNEY_MS);
      expect(p.distM).toBeGreaterThanOrEqual(prev);
      prev = p.distM;
    }
    expect(journeyPose(0).distM).toBeLessThan(20);
    expect(journeyPose(1).distM).toBeGreaterThan(1.5e11);
  });

  it('ends looking at the sky with the overlay faded out', () => {
    const end = journeyPose(1);
    expect(end.skyLook).toBe(1);
    expect(end.overlay).toBe(0);
    expect(end.system).toBe(0);
    expect(journeyPose(0).overlay).toBe(1);
  });

  it('clamps out-of-range progress', () => {
    expect(journeyPose(-1)).toEqual(journeyPose(0));
    expect(journeyPose(2)).toEqual(journeyPose(1));
  });
});
