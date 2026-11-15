/**
 * Measured motion from `contracts/analysis-result.schema.json` (spec 0010), read from
 * `/demo/<slug>/analysis-result.json`. Validated at the border; anything unexpected
 * returns `null` and the viewer falls back to the generic text.
 *
 * Contract rules kept here: the traffic light never goes above `interpretation_ceiling`
 * (always OBSERVED in this delivery), `threshold_exceeded_unverified` is NOT a measured
 * change, and synthetic examples are never shown as results.
 */
import type { Lang } from '../i18n';
import { readD3Measurement, type GuidedPairMeasurement } from '../../../src/series/core/guided-pair';

export type MotionOutcome =
  | 'change_measured'
  | 'threshold_exceeded_unverified'
  | 'change_below_criterion'
  | 'no_usable_detection'
  | 'not_evaluable'
  | 'data_error';

export type MotionAnalysis = {
  readonly analysisId: string;
  readonly outcome: MotionOutcome;
  readonly ceiling: 'OBSERVED';
  readonly separationArcsec: number;
  readonly positionAngleDeg: number;
  readonly pmTotalArcsecPerYr: number;
  readonly timeSpanDays: number;
  readonly nVisits: number;
  readonly chi2: number | null;
  readonly chi2Dof: number | null;
  readonly chi2Threshold: number | null;
  readonly residualRmsArcsec: number | null;
  readonly gaiaDeltaArcsecPerYr: { readonly ra: number; readonly dec: number } | null;
  readonly independenceNote: string | null;
  readonly excludedExposures: number;
  readonly methodName: string;
};

const OUTCOMES: readonly string[] = [
  'change_measured',
  'threshold_exceeded_unverified',
  'change_below_criterion',
  'no_usable_detection',
  'not_evaluable',
  'data_error',
];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function parseMotionAnalysis(raw: unknown): MotionAnalysis | null {
  if (!isRecord(raw)) return null;
  if (raw.is_synthetic !== false) return null; // synthetic examples are never results
  if (raw.kind !== 'astrometric_shift') return null;
  const outcome = str(raw.outcome);
  if (outcome === null || !OUTCOMES.includes(outcome)) return null;
  const astro = raw.astrometry;
  if (!isRecord(astro)) return null;
  const pm = astro.proper_motion;
  const disp = astro.displacement;
  if (!isRecord(pm) || !isRecord(disp)) return null;
  const pmRa = num(pm.pm_ra_cosdec_arcsec_per_yr);
  const pmDec = num(pm.pm_dec_arcsec_per_yr);
  const sep = num(disp.separation_arcsec);
  const pa = num(disp.position_angle_deg);
  const span = num(astro.time_span_days);
  const nVisits = num(astro.n_visits);
  if (pmRa === null || pmDec === null || sep === null || pa === null || span === null || nVisits === null) return null;

  const test = isRecord(astro.test) ? astro.test : null;
  const criteria = isRecord(raw.criteria) ? raw.criteria : null;
  const ref = isRecord(astro.reference_comparison) ? astro.reference_comparison : null;
  const dRa = ref ? num(ref.delta_pm_ra_cosdec_arcsec_per_yr) : null;
  const dDec = ref ? num(ref.delta_pm_dec_arcsec_per_yr) : null;
  const method = isRecord(raw.method) ? str(raw.method.name) : null;

  return {
    analysisId: str(raw.analysis_id) ?? '',
    outcome: outcome as MotionOutcome,
    ceiling: 'OBSERVED',
    separationArcsec: sep,
    positionAngleDeg: pa,
    pmTotalArcsecPerYr: Math.hypot(pmRa, pmDec),
    timeSpanDays: span,
    nVisits,
    chi2: test ? num(test.value) : null,
    chi2Dof: test ? num(test.dof) : null,
    chi2Threshold: criteria ? num(criteria.q_threshold_2dof) : null,
    residualRmsArcsec: num(astro.fit_residual_rms_arcsec),
    gaiaDeltaArcsecPerYr: dRa !== null && dDec !== null ? { ra: dRa, dec: dDec } : null,
    independenceNote: ref ? str(ref.independence_note) : null,
    excludedExposures: Array.isArray(raw.issues) ? raw.issues.filter(i => isRecord(i) && i.severity === 'block').length : 0,
    methodName: method ?? '',
  };
}

/** Slugs with a precomputed result under /demo/<slug>/analysis-result.json (add a slug when its file lands in main). */
const PRECOMPUTED = new Set(['epsilon-indi-b']);

export async function loadMotionAnalysis(slug: string, signal?: AbortSignal): Promise<MotionAnalysis | null> {
  if (!PRECOMPUTED.has(slug)) return null;
  try {
    const res = await fetch(`/demo/${encodeURIComponent(slug)}/analysis-result.json`, { signal });
    if (!res.ok) return null;
    return parseMotionAnalysis(await res.json());
  } catch {
    return null;
  }
}

const COMPASS_ES = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'] as const;
const COMPASS_EN = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const;

/** Position angle is measured from north through east. */
export function compassWord(positionAngleDeg: number, lang: Lang): string {
  const i = Math.round((((positionAngleDeg % 360) + 360) % 360) / 45) % 8;
  return (lang === 'es' ? COMPASS_ES : COMPASS_EN)[i];
}

const fmt = (n: number, lang: Lang, digits = 1): string =>
  n.toLocaleString(lang === 'es' ? 'es' : 'en', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Plain-language sentence for the "What changed?" block. Never claims a confirmed change. */
export function describeMotionAnalysis(lang: Lang, a: MotionAnalysis, name: string): string | null {
  const years = a.timeSpanDays / 365.25;
  const sep = fmt(a.separationArcsec, lang);
  const dir = compassWord(a.positionAngleDeg, lang);
  const yrs = fmt(years, lang);
  const pm = fmt(a.pmTotalArcsecPerYr, lang);
  switch (a.outcome) {
    case 'change_measured':
      return lang === 'es'
        ? `Medimos que ${name} se desplazó ${sep}″ hacia el ${dir} en ${yrs} años (≈ ${pm}″ por año).`
        : `We measured ${name} shifting ${sep}″ toward the ${dir} over ${yrs} years (≈ ${pm}″ per year).`;
    case 'threshold_exceeded_unverified':
      return lang === 'es'
        ? `En ${String(a.nVisits)} pasadas del detector D3, el centro de luz de ${name} se desplaza ${sep}″ hacia el ${dir} en ${yrs} años (≈ ${pm}″ al año). Observado · candidato de movimiento: aún sin verificación independiente.`
        : `Across ${String(a.nVisits)} passes in detector D3, the centre of light of ${name} shifts ${sep}″ toward the ${dir} in ${yrs} years (≈ ${pm}″ a year). Observed · motion candidate: not independently verified yet.`;
    case 'change_below_criterion':
      return lang === 'es'
        ? `No vemos un desplazamiento mayor que nuestro criterio en estas fotos. Eso no significa que el objeto esté quieto.`
        : `We see no shift larger than our criterion in these photos. That does not mean the object is still.`;
    default:
      return null;
  }
}

export type DetailRow = { readonly label: string; readonly value: string };

/** Rows for the details drawer; numbers come straight from the result file. */
export function motionDetailRows(lang: Lang, a: MotionAnalysis): DetailRow[] {
  const es = lang === 'es';
  const rows: DetailRow[] = [
    { label: es ? 'Resultado' : 'Outcome', value: outcomeLabel(lang, a.outcome) },
    { label: es ? 'Pasadas usadas' : 'Passes used', value: String(a.nVisits) },
    { label: es ? 'Periodo' : 'Time span', value: `${fmt(a.timeSpanDays, lang, 0)} ${es ? 'días' : 'days'}` },
  ];
  if (a.excludedExposures > 0) {
    rows.push({
      label: es ? 'Exposiciones descartadas' : 'Exposures excluded',
      value: `${String(a.excludedExposures)} ${es ? '(píxeles malos o fuera del campo)' : '(bad pixels or off the footprint)'}`,
    });
  }
  if (a.chi2 !== null && a.chi2Dof !== null) {
    const thr = a.chi2Threshold !== null ? `, ${es ? 'umbral' : 'threshold'} ${fmt(a.chi2Threshold, lang)}` : '';
    rows.push({ label: es ? 'Prueba estadística' : 'Statistical test', value: `χ² = ${fmt(a.chi2, lang, 0)} (${String(a.chi2Dof)} ${es ? 'gl' : 'dof'}${thr})` });
  }
  if (a.residualRmsArcsec !== null) {
    rows.push({ label: es ? 'Error del ajuste' : 'Fit residual', value: `${fmt(a.residualRmsArcsec, lang, 2)}″` });
  }
  if (a.gaiaDeltaArcsecPerYr) {
    const d = a.gaiaDeltaArcsecPerYr;
    rows.push({
      label: es ? 'Contraste con Gaia' : 'Gaia comparison',
      value: `Δ = (${fmt(d.ra, lang, 3)}, ${fmt(d.dec, lang, 3)})″/${es ? 'año' : 'yr'} — ${es ? 'solo contraste, no es independiente' : 'contrast only, not independent'}`,
    });
  }
  if (a.methodName) rows.push({ label: es ? 'Método' : 'Method', value: a.methodName });
  return rows;
}

function outcomeLabel(lang: Lang, o: MotionOutcome): string {
  const es = lang === 'es';
  switch (o) {
    case 'change_measured':
      return es ? 'Cambio medido' : 'Change measured';
    case 'threshold_exceeded_unverified':
      return es ? 'Supera el umbral, sin verificar' : 'Threshold exceeded, unverified';
    case 'change_below_criterion':
      return es ? 'Por debajo del criterio' : 'Below the criterion';
    case 'no_usable_detection':
      return es ? 'Sin detección utilizable' : 'No usable detection';
    case 'not_evaluable':
      return es ? 'No evaluable' : 'Not evaluable';
    case 'data_error':
      return es ? 'Error de datos' : 'Data error';
  }
}

/**
 * Independent two-image check (spec 0038, guided D3 pair). Accepted only for the exact,
 * ordered D3 observations; the ceiling stays OBSERVED (motion candidate).
 */
export type PairCheck = GuidedPairMeasurement;

type FrameIds = { readonly frames: readonly { readonly obs_id: string }[] };

export function parsePairCheck(caseJson: unknown, series: FrameIds): PairCheck | null {
  return readD3Measurement(caseJson, series.frames.map(f => f.obs_id));
}

/** Only ε Indi B has the guided D3 pair. */
export async function loadPairCheck(slug: string, signal?: AbortSignal): Promise<PairCheck | null> {
  if (slug !== 'epsilon-indi-b') return null;
  try {
    const [c, s] = await Promise.all(
      ['case.json', 'series.json'].map(f => fetch(`/demo/epsilon-indi-b-d3/${f}`, { signal })),
    );
    if (!c.ok || !s.ok) return null;
    const series: unknown = await s.json();
    if (!isRecord(series) || !Array.isArray(series.frames)) return null;
    const frames = series.frames.filter(isRecord).map(f => ({ obs_id: str(f.obs_id) ?? '' }));
    return parsePairCheck(await c.json(), { frames });
  } catch {
    return null;
  }
}

export function describePairCheck(lang: Lang, p: PairCheck): string {
  const sep = fmt(p.separation_arcsec, lang, 2);
  return lang === 'es'
    ? `Una comprobación aparte con dos imágenes de D3 da ${sep}″ tras corregir el paralaje. Sigue siendo un candidato de movimiento.`
    : `A separate two-image check in D3 gives ${sep}″ after correcting for parallax. It remains a motion candidate.`;
}

export function pairCheckRows(lang: Lang, p: PairCheck): DetailRow[] {
  const es = lang === 'es';
  return [
    { label: es ? 'Par D3 (2 imágenes)' : 'D3 pair (2 images)', value: `${fmt(p.separation_arcsec, lang, 2)}″ · ${es ? 'corregido por paralaje' : 'parallax-corrected'}` },
    {
      label: es ? 'Incertidumbre del par' : 'Pair uncertainty',
      value: `±${fmt(p.sigma_delta_arcsec[0], lang, 2)}″ E–O · ±${fmt(p.sigma_delta_arcsec[1], lang, 2)}″ N–S`,
    },
    { label: es ? 'Nivel' : 'Level', value: es ? 'Observado · candidato' : 'Observed · candidate' },
  ];
}
