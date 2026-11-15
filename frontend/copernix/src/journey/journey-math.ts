/**
 * Pure maths for the entry journey (satellite → Earth → Sun → Milky Way → Copernix sky).
 * Distances and directions are real for the current date; only the glow sprites are visual aids.
 */

export const EARTH_RADIUS_M = 6_371_000;
export const AU_M = 149_597_870_700;
export const SPHEREX_ALTITUDE_M = 700_000;
/** Galactic centre (l = 0, b = 0) in ICRS, degrees. */
export const GALACTIC_CENTER = { ra: 266.405, dec: -28.936 } as const;
/** North galactic pole (ICRS), degrees. */
export const GALACTIC_NORTH_POLE = { ra: 192.85948, dec: 27.12825 } as const;
/** Ecliptic north pole (J2000), degrees. */
export const ECLIPTIC_POLE = { ra: 270, dec: 66.5607 } as const;
export const JOURNEY_MS = 11_000;

const D2R = Math.PI / 180;

/** Sky-sphere frame shared with the NASA SVS Milky Way map: y = celestial north, RA 90° → −z. */
export function eqVec(raDeg: number, decDeg: number): [number, number, number] {
  const a = raDeg * D2R;
  const d = decDeg * D2R;
  return [Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a)];
}

const daysSinceJ2000 = (date: Date): number => date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545;

/** Low-precision solar position (Astronomical Almanac, ~0.01° over 1950–2050). */
export function sunRaDec(date: Date): { ra: number; dec: number } {
  const n = daysSinceJ2000(date);
  const L = (280.46 + 0.9856474 * n) * D2R;
  const g = (357.528 + 0.9856003 * n) * D2R;
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 0.0000004 * n) * D2R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / D2R;
  return { ra: (ra + 360) % 360, dec };
}

/** Greenwich mean sidereal time, degrees (rotates the Earth texture to the real time). */
export function gmstDeg(date: Date): number {
  const n = daysSinceJ2000(date);
  return (((280.46061837 + 360.98564736629 * n) % 360) + 360) % 360;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** Smooth ease between edge0 and edge1. */
export function smooth(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export type JourneyPose = {
  /** Camera distance from the satellite, metres. */
  readonly distM: number;
  /** 0 → look at the satellite, 1 → look at the Earth. */
  readonly toEarth: number;
  /** 0 → Earth, 1 → Sun. */
  readonly toSun: number;
  /** 0 → local orbit framing, 1 → wide view above the ecliptic. */
  readonly swing: number;
  /** 0 → looking at the system, 1 → looking at the galactic centre like the Copernix globe. */
  readonly skyLook: number;
  /** Opacity of Sun glow, Earth marker and orbit (fades out at the end). */
  readonly system: number;
  /** Overlay opacity; reaches 0 so the Copernix sky shows through. */
  readonly overlay: number;
  /** Vertical field of view, degrees. */
  readonly fovDeg: number;
  /** Caption shown: 0 satellite, 1 Earth, 2 Sun, 3 Milky Way. */
  readonly caption: 0 | 1 | 2 | 3;
};

const LOG_START = Math.log10(9);
const LOG_EARTH = Math.log10(4.5e7);
const LOG_END = Math.log10(2.6 * AU_M);

export function journeyPose(progress: number): JourneyPose {
  const t = clamp01(progress);
  const s = t * JOURNEY_MS;
  const near = smooth(1800, 5200, s);
  const far = smooth(5000, 8600, s);
  const logD = LOG_START + 0.08 * smooth(0, 1800, s) + (LOG_EARTH - LOG_START - 0.08) * near + (LOG_END - LOG_EARTH) * far;
  const skyLook = smooth(7800, 10300, s);
  const caption: JourneyPose['caption'] = s < 2600 ? 0 : s < 5600 ? 1 : s < 8400 ? 2 : 3;
  return {
    distM: 10 ** logD,
    toEarth: smooth(3700, 5600, s),
    toSun: smooth(5400, 8200, s),
    swing: smooth(3800, 8000, s),
    skyLook,
    system: (1 - smooth(8400, 9800, s)) * smooth(5200, 6800, s),
    overlay: 1 - smooth(9800, JOURNEY_MS, s),
    fovDeg: 42 + 18 * smooth(4000, 7000, s) + 30 * skyLook,
    caption,
  };
}
