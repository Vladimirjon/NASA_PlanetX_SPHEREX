import type { components } from '../../src/api/schema';
import { expectedMotionPixels, type TanGrid } from '../../src/series/core/tan';
import { timeSpanYears } from '../../src/series/core/explain';
import type { Lang } from './i18n';

type Series = components['schemas']['Series'];
type Frame = components['schemas']['Frame'];

export type WavelengthFacts = {
  readonly wavelengthUm: number | null;
  readonly detector: number | null;
  readonly toleranceNm: number | null;
};

export type MotionFacts = {
  readonly pixels: number;
  readonly arcsec: number;
  readonly pixelScaleArcsec: number;
};

/** Extract λ / detector / ±nm from structured series fields. */
export function wavelengthFacts(series: Series): WavelengthFacts {
  const frame0 = series.frames.length > 0 ? series.frames[0] : undefined;
  return {
    wavelengthUm: series.reference_wavelength_um ?? frame0?.wavelength_um ?? null,
    detector: series.detector ?? frame0?.detector ?? null,
    toleranceNm: series.wavelength_tolerance_nm ?? null,
  };
}

/** Extract expected motion numbers from structured series fields. */
export function motionFacts(series: Series): MotionFacts | null {
  const frames = series.frames;
  if (frames.length < 2) return null;
  const first = frames[0].predicted_position;
  const last = frames[frames.length - 1].predicted_position;
  if (!first || !last) return null;
  const grid: TanGrid = {
    shape: [series.grid.shape[0], series.grid.shape[1]],
    crval_deg: [series.grid.crval_deg[0], series.grid.crval_deg[1]],
    pixel_scale_arcsec: series.grid.pixel_scale_arcsec,
  };
  const pixels = expectedMotionPixels(first, last, grid);
  return {
    pixels,
    arcsec: pixels * series.grid.pixel_scale_arcsec,
    pixelScaleArcsec: series.grid.pixel_scale_arcsec,
  };
}

/**
 * Pure fallback: pull the same numbers from English explain() strings
 * when only text is available (no structured Series).
 */
export function extractExplainNumbers(text: string): {
  readonly wavelengthUm: number | null;
  readonly detector: number | null;
  readonly toleranceNm: number | null;
  readonly years: number | null;
  readonly motionPx: number | null;
  readonly motionArcsec: number | null;
  readonly pixelScaleArcsec: number | null;
} {
  const um = text.match(/(\d+(?:\.\d+)?)\s*µm/);
  const det = text.match(/detector\s+D(\d+)/i);
  const tol = text.match(/within\s+(\d+(?:\.\d+)?)\s*nm/i);
  const years = text.match(/(\d+(?:\.\d+)?)\s+years?\s+between/i);
  const motion = text.match(/≈\s*(\d+(?:\.\d+)?)\s*px\s*\((\d+(?:\.\d+)?)["″]/i);
  const pix = text.match(/SPHEREx\s+pixel\s*=\s*(\d+(?:\.\d+)?)["″]/i);
  return {
    wavelengthUm: um ? Number(um[1]) : null,
    detector: det ? Number(det[1]) : null,
    toleranceNm: tol ? Number(tol[1]) : null,
    years: years ? Number(years[1]) : null,
    motionPx: motion ? Number(motion[1]) : null,
    motionArcsec: motion ? Number(motion[2]) : null,
    pixelScaleArcsec: pix ? Number(pix[1]) : null,
  };
}

export function formatVisitLabelI18n(
  lang: Lang,
  frameIndex: number,
  frameCount: number,
  tMid: string,
): string {
  const date = tMid.slice(0, 10);
  if (lang === 'es') {
    return `Visita ${String(frameIndex + 1)} de ${String(frameCount)} · ${date}`;
  }
  return `Visit ${String(frameIndex + 1)} of ${String(frameCount)} · ${date}`;
}

export function describeWavelengthI18n(lang: Lang, series: Series): string {
  const f = wavelengthFacts(series);
  const detLabel =
    f.detector === null
      ? lang === 'es'
        ? 'detector desconocido'
        : 'unknown detector'
      : `detector D${String(f.detector)}`;
  const lamLabel =
    f.wavelengthUm === null
      ? lang === 'es'
        ? 'longitud de onda desconocida'
        : 'unknown wavelength'
      : `${f.wavelengthUm.toFixed(3)} µm`;
  const tolLabel =
    f.toleranceNm === null
      ? lang === 'es'
        ? 'su tolerancia'
        : 'its tolerance'
      : `${f.toleranceNm.toFixed(1)} nm`;
  if (lang === 'es') {
    return `Luz infrarroja a ${lamLabel} (${detLabel}), el mismo color en cada fotograma dentro de ±${tolLabel}`;
  }
  return `Infrared light at ${lamLabel} (${detLabel}), the same colour in every frame within ${tolLabel}`;
}

export function describeTimeSpanI18n(lang: Lang, frames: readonly Frame[]): string {
  const years = timeSpanYears(frames);
  if (years === null) {
    return lang === 'es'
      ? 'Una sola visita — aún no hay línea de tiempo.'
      : 'Single visit — no time baseline yet.';
  }
  if (lang === 'es') {
    const unit = years === 1 ? 'año' : 'años';
    return `${years.toFixed(1)} ${unit} entre la primera y la última imagen`;
  }
  return `${years.toFixed(1)} year${years === 1 ? '' : 's'} between first and last image`;
}

export function describeExpectedMotionI18n(lang: Lang, series: Series): string | null {
  const m = motionFacts(series);
  if (!m) return null;
  if (lang === 'es') {
    return `Movimiento esperado según el catálogo (no medido aquí) ≈ ${m.pixels.toFixed(1)} px (${m.arcsec.toFixed(1)}″); píxel SPHEREx = ${m.pixelScaleArcsec.toFixed(2)}″`;
  }
  return `Expected motion from the catalogue (not measured here) ≈ ${m.pixels.toFixed(1)} px (${m.arcsec.toFixed(1)}″); SPHEREx pixel = ${m.pixelScaleArcsec.toFixed(2)}″`;
}

/**
 * Honest “What changed?” line (docs/reviews/regions/2026-11-14-cinco-regiones.md, spec 0034).
 * It never turns a catalogue prediction into a measured shift and never claims a brightness
 * change that was not measured. Regions without a measurement get the neutral 0034:46 sentence.
 */
const REGION_LINES: Readonly<Record<string, { readonly en: string; readonly es: string }>> = {
  'barnards-star': {
    en: "SPHEREx observed this region three times. Barnard's Star is too bright for the detector: the pixels at its position are saturated and hidden, so its motion cannot be measured in these images. Its known motion of about 10″ per year comes from the Gaia catalogue.",
    es: 'SPHEREx observó esta región tres veces. La estrella de Barnard es demasiado brillante para el detector: los píxeles en su posición están saturados y ocultos, así que su movimiento no se puede medir en estas imágenes. Su movimiento conocido, de unos 10″ por año, viene del catálogo Gaia.',
  },
  'wise-0855': {
    en: 'SPHEREx observed this region twice, but WISE 0855 is too faint to detect in a single image at this wavelength. The ring marks where it is expected. The light next to the ring stays in place between the two dates, so it is probably a different source. No change can be measured here.',
    es: 'SPHEREx observó esta región dos veces, pero WISE 0855 es demasiado débil para detectarla en una sola imagen a esta longitud de onda. El anillo marca dónde se espera. La luz junto al anillo no se mueve entre las dos fechas, así que probablemente es otra fuente. Aquí no se puede medir un cambio.',
  },
  'rw-aurigae': {
    en: 'SPHEREx observed this region twice. RW Aurigae is brighter than the level at which the detector responds linearly, and some pixels at its position are hidden in the second image. The difference you see can be caused by those hidden pixels. These data do not establish a brightness change.',
    es: 'SPHEREx observó esta región dos veces. RW Aurigae es más brillante que el nivel en que el detector responde de forma lineal, y algunos píxeles en su posición están ocultos en la segunda imagen. La diferencia que ves puede deberse a esos píxeles ocultos. Estos datos no establecen un cambio de brillo.',
  },
  'r-draconis': {
    en: 'SPHEREx observed this region three times. R Draconis is far too bright for the detector: the pixels at its position are saturated and hidden in every image, so its brightness changes cannot be measured here.',
    es: 'SPHEREx observó esta región tres veces. R Draconis es demasiado brillante para el detector: los píxeles en su posición están saturados y ocultos en todas las imágenes, así que aquí no se pueden medir sus cambios de brillo.',
  },
};

export function describeChangeLineI18n(
  lang: Lang,
  series: Series,
  _objectName: string,
  opts?: { readonly slug?: string | null },
): string {
  if (series.frames.length < 2) {
    return lang === 'es'
      ? 'Aún no hay fotos suficientes para comparar.'
      : 'Not enough photos yet to compare.';
  }
  const region = opts?.slug ? REGION_LINES[opts.slug] : undefined;
  if (region) return region[lang];
  return lang === 'es'
    ? 'Puede verse una diferencia visual. Su causa no se ha establecido.'
    : 'A visual difference may be visible. Its cause has not been established.';
}

export function motionProvenanceI18n(lang: Lang, slug: string | null | undefined): string {
  if (slug === 'wise-0855') {
    return lang === 'es'
      ? 'posición esperada (Luhman & Esplin 2016)'
      : 'expected position (Luhman & Esplin 2016)';
  }
  return lang === 'es'
    ? 'posición esperada (movimiento propio Gaia DR3)'
    : 'expected position (Gaia DR3 proper motion)';
}

/** Localize known engine status strings (engine stays English-only). */
export function localizeEngineStatus(lang: Lang, raw: string): string {
  if (!raw) return '';
  const loading = raw.match(/^Loading sky images from IRSA…(?:\s+(\d+)\s+ready)?$/);
  if (loading) {
    const n = loading[1];
    if (lang === 'es') {
      return n
        ? `Cargando imágenes del cielo desde IRSA… ${n} listas`
        : 'Cargando imágenes del cielo desde IRSA…';
    }
    return raw;
  }
  if (raw.startsWith('This channel is blank')) {
    return lang === 'es'
      ? 'Este canal está vacío a propósito: una transición dicróica no tiene datos en DR1. Cualquier imagen visible pertenece al canal anterior.'
      : raw;
  }
  if (raw.startsWith('WebGL context lost')) {
    return lang === 'es' ? 'Se perdió el contexto WebGL. Recarga para restaurar el cielo.' : raw;
  }
  if (raw.startsWith('WebGL context restored')) {
    return lang === 'es' ? 'Contexto WebGL restaurado.' : raw;
  }
  return raw;
}
