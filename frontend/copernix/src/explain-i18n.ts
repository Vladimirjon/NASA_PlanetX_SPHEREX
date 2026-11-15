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
    return `Movimiento esperado ≈ ${m.pixels.toFixed(1)} px (${m.arcsec.toFixed(1)}″); píxel SPHEREx = ${m.pixelScaleArcsec.toFixed(2)}″`;
  }
  return `Expected motion ≈ ${m.pixels.toFixed(1)} px (${m.arcsec.toFixed(1)}″); SPHEREx pixel = ${m.pixelScaleArcsec.toFixed(2)}″`;
}

/**
 * Concrete “what changed?” line for the left column.
 * Uses real numbers from the series when motion is available;
 * otherwise a brightness / short / generic phrase (no jargon).
 */
export function describeChangeLineI18n(
  lang: Lang,
  series: Series,
  objectName: string,
  opts?: { readonly variableHint?: boolean },
): string {
  const n = series.frames.length;
  if (n < 2) {
    return lang === 'es'
      ? 'Aún no hay fotos suficientes para medir un cambio.'
      : 'Not enough photos yet to measure a change.';
  }
  const m = motionFacts(series);
  if (m && m.pixels >= 0.3) {
    if (lang === 'es') {
      return `En estas ${String(n)} fotos, ${objectName} se desplazó ≈ ${m.pixels.toFixed(1)} píxeles (≈ ${m.arcsec.toFixed(1)} segundos de arco).`;
    }
    return `Across these ${String(n)} photos, ${objectName} shifted by ≈ ${m.pixels.toFixed(1)} pixels (≈ ${m.arcsec.toFixed(1)} arcseconds).`;
  }
  // Comparability is OBSERVED | EVALUATED only (never CONFIRMED from software).
  const preferBrightness = Boolean(opts?.variableHint) || series.comparability.level.length > 0;
  if (preferBrightness) {
    if (lang === 'es') {
      return `En estas ${String(n)} fotos, su brillo cambia.`;
    }
    return `Across these ${String(n)} photos, its brightness changes.`;
  }
  return lang === 'es'
    ? 'Las fotos muestran una diferencia aparente.'
    : 'The photos show an apparent difference.';
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
