import type { Lang } from '../i18n';

/**
 * Map SIMBAD object_type codes to short, non-jargon labels.
 * Codes listed in the brief (BY*, BD*, Mi*, Pl, *) plus a few common ones.
 */
const LABELS: Record<string, { readonly es: string; readonly en: string }> = {
  'BY*': { es: 'Estrella cercana', en: 'Nearby star' },
  'BD*': { es: 'Enana marrón', en: 'Brown dwarf' },
  'Mi*': { es: 'Estrella variable', en: 'Variable star' },
  Pl: { es: 'Planeta', en: 'Planet' },
  'PM*': { es: 'Estrella cercana', en: 'Nearby star' },
  'TT*': { es: 'Estrella variable', en: 'Variable star' },
  'SB*': { es: 'Estrella', en: 'Star' },
  '**': { es: 'Estrella', en: 'Star' },
  '*': { es: 'Estrella', en: 'Star' },
  'V*': { es: 'Estrella variable', en: 'Variable star' },
  'LP*': { es: 'Estrella variable', en: 'Variable star' },
  'Or*': { es: 'Estrella variable', en: 'Variable star' },
};

const FALLBACK = { es: 'Objeto astronómico', en: 'Astronomical object' };

/** Translate a SIMBAD `object_type` code into a friendly label. */
export function friendlyObjectType(code: string | null | undefined, lang: Lang = 'es'): string {
  if (!code || !code.trim()) return FALLBACK[lang];
  const key = code.trim();
  if (Object.prototype.hasOwnProperty.call(LABELS, key)) {
    return LABELS[key][lang];
  }
  // Strip qualifiers like "BY*_Candidate" → try prefix before underscore
  const base = key.split('_')[0] ?? key;
  if (Object.prototype.hasOwnProperty.call(LABELS, base)) {
    return LABELS[base][lang];
  }
  return FALLBACK[lang];
}
