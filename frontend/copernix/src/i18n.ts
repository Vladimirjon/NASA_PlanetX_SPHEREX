export type Lang = 'es' | 'en';

const DICT = {
  en: {
    title: 'Copernix · SPHEREx sky',
    brand: 'Copernix',
    searchPlaceholder: 'Name or RA, Dec',
    searchSubmit: 'Go',
    tipRaDecTitle: 'RA and Dec',
    tipRaDecBody: 'A sky address, like longitude and latitude. RA runs east–west, Dec north–south.',
    about: 'About',
    play: 'Play',
    pause: 'Pause',
    modeLoop: 'Loop',
    modeDiff: 'Difference',
    modeColour: 'Colour',
    band: 'Spectral band',
    projection: 'Projection',
    zoom: 'Zoom',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    mapMenu: 'Projection & zoom',
    whatChanged: 'What changed?',
    howCalculated: 'How we calculate it',
    loading: 'Loading sky images…',
    loadingProgress: 'Loading sky images…',
    demoOffline: 'Offline demo',
    liveApi: 'Live series',
    noSeries: 'No comparable visits for this target yet.',
    urlInvalid: 'Invalid link parameters.',
    mapOff: 'Sky map off (?map=off). Series panel only.',
    engineFail: 'Sky renderer unavailable on this device.',
    observed: 'Observed',
    evaluated: 'Evaluated',
    confirmed: 'Confirmed',
    observedHint: 'Images show an apparent difference.',
    evaluatedHint: 'Difference persists after quality controls.',
    confirmedHint: 'Validated with enough scientific evidence.',
    neverConfirmed: 'Software never assigns “Confirmed” on its own.',
    provenance: 'Provenance',
    provenanceFile: 'File',
    provenanceDate: 'Date (UTC)',
    provenanceBand: 'Band / λ',
    provenanceCollection: 'Collection',
    cutoutBeforeAfter: 'Before · After',
    targetsLabel: 'Challenge targets',
    retry: 'Retry',
    analyze: 'Analyze this region',
    statusIdle: 'Pick a target or enter coordinates.',
    searchToggle: 'Search',
    sheetExpand: 'Expand panel',
    sheetCollapse: 'Collapse panel',
    progress0: 'Querying IRSA…',
    progress1: 'Reading images from archive…',
    progress2: 'Aligning visits to a common grid…',
    progress3: 'Building the time series…',
    progress4: 'Still working — first analysis can take up to ~20 s…',
  },
  es: {
    title: 'Copernix · cielo SPHEREx',
    brand: 'Copernix',
    searchPlaceholder: 'Nombre o RA, Dec',
    searchSubmit: 'Ir',
    tipRaDecTitle: 'RA y Dec',
    tipRaDecBody: 'Una dirección en el cielo, como longitud y latitud. RA va de este a oeste, Dec de norte a sur.',
    about: 'Acerca de',
    play: 'Reproducir',
    pause: 'Pausar',
    modeLoop: 'Bucle',
    modeDiff: 'Diferencia',
    modeColour: 'Color',
    band: 'Banda espectral',
    projection: 'Proyección',
    zoom: 'Zoom',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    mapMenu: 'Proyección y zoom',
    whatChanged: '¿Qué cambió?',
    howCalculated: 'Cómo lo calculamos',
    loading: 'Cargando imágenes del cielo…',
    loadingProgress: 'Cargando imágenes del cielo…',
    demoOffline: 'Demo sin conexión',
    liveApi: 'Serie en vivo',
    noSeries: 'Aún no hay visitas comparables para este objetivo.',
    urlInvalid: 'Parámetros de enlace no válidos.',
    mapOff: 'Mapa desactivado (?map=off). Solo el panel de serie.',
    engineFail: 'El mapa del cielo no está disponible en este dispositivo.',
    observed: 'Observado',
    evaluated: 'Evaluado',
    confirmed: 'Confirmado',
    observedHint: 'Las imágenes muestran una diferencia aparente.',
    evaluatedHint: 'La diferencia persiste tras los controles de calidad.',
    confirmedHint: 'Validado con evidencia científica suficiente.',
    neverConfirmed: 'El software nunca asigna “Confirmado” por sí solo.',
    provenance: 'Procedencia',
    provenanceFile: 'Archivo',
    provenanceDate: 'Fecha (UTC)',
    provenanceBand: 'Banda / λ',
    provenanceCollection: 'Colección',
    cutoutBeforeAfter: 'Antes · Después',
    targetsLabel: 'Objetivos del reto',
    retry: 'Reintentar',
    analyze: 'Analizar esta región',
    statusIdle: 'Elige un objetivo o escribe coordenadas.',
    searchToggle: 'Buscar',
    sheetExpand: 'Desplegar panel',
    sheetCollapse: 'Plegar panel',
    progress0: 'Consultando IRSA…',
    progress1: 'Leyendo imágenes del archivo…',
    progress2: 'Alineando visitas a una cuadrícula común…',
    progress3: 'Construyendo la serie temporal…',
    progress4: 'Sigue trabajando — el primer análisis puede tardar ~20 s…',
  },
} as const;

export type MessageKey = keyof (typeof DICT)['en'];

export function detectLang(search: string = typeof window !== 'undefined' ? window.location.search : ''): Lang {
  try {
    const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('lang');
    if (q === 'es' || q === 'en') return q;
    const stored = localStorage.getItem('naza_lang');
    if (stored === 'es' || stored === 'en') return stored;
    const raw = navigator.language;
    return raw.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function t(lang: Lang, key: MessageKey): string {
  return DICT[lang][key];
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem('naza_lang', lang);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Localized series-build progress (mirrors app/core/progress phases). */
export function seriesProgressMessage(lang: Lang, elapsedMs: number): string {
  const phases: { afterMs: number; key: MessageKey }[] = [
    { afterMs: 0, key: 'progress0' },
    { afterMs: 2500, key: 'progress1' },
    { afterMs: 7000, key: 'progress2' },
    { afterMs: 12000, key: 'progress3' },
    { afterMs: 18000, key: 'progress4' },
  ];
  let key: MessageKey = 'progress0';
  for (const p of phases) {
    if (elapsedMs >= p.afterMs) key = p.key;
  }
  return t(lang, key);
}
