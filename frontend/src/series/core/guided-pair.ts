export const D3_OBSERVATION_IDS = [
  'ivo://irsa.ipac/spherex_dr1?2025W24_1A_0245_4/D3',
  'ivo://irsa.ipac/spherex_qr3?2026W40_1A_0070_2/D3',
] as const;

export type GuidedPairMeasurement = {
  readonly separation_arcsec: number;
  readonly delta_arcsec: readonly [number, number];
  readonly sigma_delta_arcsec: readonly [number, number];
  readonly source_revision: string;
};

function isFinitePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function matchesObservations(ids: unknown): boolean {
  return Array.isArray(ids) && ids.length === D3_OBSERVATION_IDS.length &&
    D3_OBSERVATION_IDS.every((id, i) => ids[i] === id);
}

/** The candidate measurement is attached only to the exact, ordered D3 frames. */
export function readD3Measurement(value: unknown, frameIds: readonly string[]): GuidedPairMeasurement | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const { separation_arcsec, delta_arcsec, sigma_delta_arcsec, source_revision } = record;
  if (
    record.case_ref !== 'eps-indi-b-d3-pair' || record.interpretation_ceiling !== 'OBSERVED' ||
    !matchesObservations(record.observation_ids) || !matchesObservations(frameIds) ||
    typeof separation_arcsec !== 'number' || !Number.isFinite(separation_arcsec) || separation_arcsec < 0 ||
    !isFinitePair(delta_arcsec) || !isFinitePair(sigma_delta_arcsec) ||
    sigma_delta_arcsec.some(sigma => sigma <= 0) ||
    Math.abs(Math.hypot(...delta_arcsec) - separation_arcsec) > 0.001 ||
    typeof source_revision !== 'string' || !source_revision.trim()
  ) return null;
  return { separation_arcsec, delta_arcsec, sigma_delta_arcsec, source_revision };
}
