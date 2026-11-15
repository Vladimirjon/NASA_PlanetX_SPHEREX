import type { Lang } from './i18n';

/** Human band name for SPHEREx wavelengths (0.75–5.0 µm). */
export function infraredBandName(um: number, lang: Lang): string {
  if (um < 2.5) {
    return lang === 'es' ? 'infrarrojo cercano' : 'near-infrared';
  }
  return lang === 'es' ? 'infrarrojo medio' : 'mid-infrared';
}

/** e.g. "luz de 0,97 µm — infrarrojo cercano" */
export function formatLightLabel(um: number, lang: Lang): string {
  const num =
    lang === 'es'
      ? um.toFixed(2).replace('.', ',')
      : um.toFixed(2);
  const band = infraredBandName(um, lang);
  if (lang === 'es') return `luz de ${num} µm — ${band}`;
  return `light at ${num} µm — ${band}`;
}

/** Short localized date: "31 oct 2025" / "Oct 31, 2025". */
export function formatVisitDate(iso: string, lang: Lang): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : `${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  if (lang === 'es') {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${String(d.getUTCDate())} ${months[d.getUTCMonth()]} ${String(d.getUTCFullYear())}`;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
