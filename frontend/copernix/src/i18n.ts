export type Lang = 'es' | 'en';

const TARGET_DESC = {
  en: {
    'barnards-star': 'Nearby fast star — moves ~10″ per year',
    'epsilon-indi-b': 'Nearby brown dwarf — clear proper motion',
    'wise-0855': 'Coldest known brown dwarf.',
    'rw-aurigae': 'Young variable star — brightness changes',
    'r-draconis': 'Pulsating giant — long-period variable',
  },
  es: {
    'barnards-star': 'Estrella cercana y rápida — se mueve ~10″ al año',
    'epsilon-indi-b': 'Enana marrón cercana — movimiento propio claro',
    'wise-0855': 'La enana marrón más fría que se conoce.',
    'rw-aurigae': 'Estrella joven variable — cambia de brillo',
    'r-draconis': 'Gigante pulsante — variable de periodo largo',
  },
} as const;

const DICT = {
  en: {
    title: 'Copernix · SPHEREx sky',
    brand: 'Copernix',
    searchPlaceholder: 'Search an object…',
    searchSubmit: 'Go',
    tipRaDecTitle: 'RA and Dec',
    tipRaDecBody: 'A sky address, like longitude and latitude. RA runs east–west, Dec north–south.',
    about: 'About',
    play: 'Play',
    pause: 'Pause',
    modeLoop: 'Photos in sequence',
    modeDiff: 'Only what changed',
    modeColour: 'Dates in colour',
    modeHelpLoop:
      'We play the photos one after another, like a short video. Watch for anything that moves or changes brightness.',
    modeHelpDiff:
      'We subtract the older photo from the newer one: what stayed the same goes grey; what moved leaves a dark spot (where it was) and a bright spot (where it is).',
    modeHelpColour:
      'The first photo is tinted magenta and the last one green. Where they overlap the colours mix — handy to see what moved between the two dates.',
    lightType: 'Type of light',
    lightTypeHint:
      'SPHEREx sees the sky in hundreds of colours of infrared light, invisible to us. Pick one; we only compare photos of the same colour.',
    tipMicronTitle: 'µm and infrared',
    tipMicronBody:
      'A micrometre (µm) is a millionth of a metre — the “colour” of infrared light. SPHEREx cannot see the same light our eyes see; it photographs heat-like infrared.',
    band: 'Type of light',
    colours: 'Type of light',
    projection: 'Projection',
    zoom: 'Zoom',
    zoomIn: '＋',
    zoomOut: '－',
    zoomInLabel: 'Zoom in',
    zoomOutLabel: 'Zoom out',
    mapHint: 'Drag to move the sky · scroll to zoom',
    centerObject: 'Center on object',
    advanced: 'Advanced',
    advancedHint: 'How the round sky is flattened onto the screen. Most people can leave this alone.',
    projSin: 'Flat',
    projTan: 'Tangential',
    projAit: 'Whole sky',
    mapMenu: 'Advanced',
    mapMenuLabel: 'Advanced map options',
    whatChanged: 'What changed?',
    howCalculated: 'How we calculate it',
    loading: 'Loading sky images…',
    loadingProgress: 'Loading sky images…',
    demoOffline: 'Offline demo',
    liveApi: 'Live series',
    noSeries: 'SPHEREx does not yet have two photos of this place.',
    noSeriesFriendly: 'SPHEREx does not yet have two photos of this place. The map is still centered on it.',
    urlInvalid: 'Invalid link parameters.',
    mapOff: 'Sky map off (?map=off). Series panel only.',
    engineFail: 'Sky renderer unavailable on this device.',
    observed: 'Observed',
    evaluated: 'Evaluated',
    confirmed: 'Confirmed',
    observedHint: 'The images show an apparent difference.',
    evaluatedHint: 'The difference persists after quality controls.',
    confirmedHint: 'Validated with enough scientific evidence.',
    observedTip: 'Observed: the photos show an apparent difference.',
    evaluatedTip: 'Evaluated: the difference persists after quality checks.',
    confirmedTip: 'Confirmed: validated with enough scientific evidence. Software never assigns this on its own.',
    neverConfirmed: 'Software never assigns “Confirmed” on its own.',
    provenance: 'Details & provenance',
    provenanceFile: 'File',
    provenanceDate: 'Date (UTC)',
    provenanceBand: 'Light',
    provenanceCollection: 'Collection',
    cutoutBeforeAfter: 'Before and after',
    targetsLabel: 'Featured',
    catalogSearchLabel: 'Search any star or coordinates',
    searchEmpty: 'Type a name or sky coordinates.',
    searchSearching: 'Searching…',
    searchNoResults: 'No matches. Try another name or RA, Dec.',
    searchError: 'Search is temporarily unavailable. Try again in a moment.',
    photoOf: 'Photo',
    photoOfOf: 'of',
    oldest: 'Oldest',
    newest: 'Newest',
    retry: 'Retry',
    analyze: 'Analyze this point',
    statusIdle: 'Pick a featured object or search for any star.',
    searchToggle: 'Search',
    sheetExpand: 'Expand panel',
    sheetCollapse: 'Collapse panel',
    progress0: 'Querying IRSA…',
    progress1: 'Reading images from archive…',
    progress2: 'Aligning visits to a common grid…',
    progress3: 'Building the time series…',
    progress4: 'Still working — first analysis can take up to ~20 s…',
    returnTo: 'Return to',
    closeDrawer: 'Close',
    expandCutout: 'Enlarge cutout',
    closeCutout: 'Close cutout',
    pointTitlePrefix: 'Point RA',
    whatAmISeeing: 'What am I looking at?',
    introNext: 'Next',
    introSkip: 'Skip',
    introDone: 'Got it',
    introStep1: 'This is the real sky, photographed by NASA’s SPHEREx telescope.',
    introStep2: 'We pick an object and flip through its photos over time.',
    introStep3: 'Look for what moves or changes brightness: that is what changed.',
    changeMotion:
      'Across these {n} photos, {name} shifted by ≈ {px} pixels (≈ {arcsec} arcseconds).',
    changeBrightness: 'Across these {n} photos, its brightness changes.',
    changeShort: 'Not enough photos yet to measure a change.',
    changeGeneric: 'The photos show an apparent difference.',
  },
  es: {
    title: 'Copernix · cielo SPHEREx',
    brand: 'Copernix',
    searchPlaceholder: 'Buscar un objeto…',
    searchSubmit: 'Ir',
    tipRaDecTitle: 'RA y Dec',
    tipRaDecBody: 'Una dirección en el cielo, como longitud y latitud. RA va de este a oeste, Dec de norte a sur.',
    about: 'Acerca de',
    play: 'Reproducir',
    pause: 'Pausar',
    modeLoop: 'Fotos en secuencia',
    modeDiff: 'Solo lo que cambió',
    modeColour: 'Fechas en color',
    modeHelpLoop:
      'Pasamos las fotos una tras otra, como un video corto. Fíjate en lo que se mueve o cambia de brillo.',
    modeHelpDiff:
      'Restamos la foto vieja a la nueva: lo que no cambió queda gris; lo que se movió deja un punto oscuro (dónde estaba) y uno claro (dónde está).',
    modeHelpColour:
      'La primera foto se tiñe de magenta y la última de verde. Donde se solapan se mezclan — sirve para ver qué se movió entre las dos fechas.',
    lightType: 'Tipo de luz',
    lightTypeHint:
      'SPHEREx ve el cielo en cientos de colores de luz infrarroja, invisible para nosotros. Elige uno; solo comparamos fotos del mismo color.',
    tipMicronTitle: 'µm e infrarrojo',
    tipMicronBody:
      'Un micrómetro (µm) es una millonésima de metro: el «color» de la luz infrarroja. SPHEREx no ve la misma luz que nuestros ojos; fotografía infrarrojo parecido al calor.',
    band: 'Tipo de luz',
    colours: 'Tipo de luz',
    projection: 'Proyección',
    zoom: 'Zoom',
    zoomIn: '＋',
    zoomOut: '－',
    zoomInLabel: 'Acercar',
    zoomOutLabel: 'Alejar',
    mapHint: 'Arrastra para mover el cielo · rueda para acercar',
    centerObject: 'Centrar en el objeto',
    advanced: 'Avanzado',
    advancedHint: 'Cómo se aplana el cielo redondo en la pantalla. La mayoría puede dejarlo como está.',
    projSin: 'Plana',
    projTan: 'Tangencial',
    projAit: 'Todo el cielo',
    mapMenu: 'Avanzado',
    mapMenuLabel: 'Opciones avanzadas del mapa',
    whatChanged: '¿Qué cambió?',
    howCalculated: 'Cómo lo calculamos',
    loading: 'Cargando imágenes del cielo…',
    loadingProgress: 'Cargando imágenes del cielo…',
    demoOffline: 'Demo sin conexión',
    liveApi: 'Serie en vivo',
    noSeries: 'SPHEREx aún no tiene dos fotos de este lugar.',
    noSeriesFriendly:
      'SPHEREx aún no tiene dos fotos de este lugar. El mapa sigue centrado en él.',
    urlInvalid: 'Parámetros de enlace no válidos.',
    mapOff: 'Mapa desactivado (?map=off). Solo el panel de serie.',
    engineFail: 'El mapa del cielo no está disponible en este dispositivo.',
    observed: 'Observado',
    evaluated: 'Evaluado',
    confirmed: 'Confirmado',
    observedHint: 'Las imágenes muestran una diferencia aparente.',
    evaluatedHint: 'La diferencia persiste tras los controles de calidad.',
    confirmedHint: 'Validado con evidencia científica suficiente.',
    observedTip: 'Observado: las fotos muestran una diferencia aparente.',
    evaluatedTip: 'Evaluado: la diferencia persiste tras los controles de calidad.',
    confirmedTip:
      'Confirmado: validado con evidencia científica suficiente. El software nunca asigna este nivel por sí solo.',
    neverConfirmed: 'El software nunca asigna “Confirmado” por sí solo.',
    provenance: 'Detalles y procedencia',
    provenanceFile: 'Archivo',
    provenanceDate: 'Fecha (UTC)',
    provenanceBand: 'Luz',
    provenanceCollection: 'Colección',
    cutoutBeforeAfter: 'Antes y después',
    targetsLabel: 'Destacados',
    catalogSearchLabel: 'Busca cualquier estrella o coordenadas',
    searchEmpty: 'Escribe un nombre o coordenadas del cielo.',
    searchSearching: 'Buscando…',
    searchNoResults: 'Sin resultados. Prueba otro nombre o RA, Dec.',
    searchError: 'La búsqueda no está disponible ahora. Inténtalo en un momento.',
    photoOf: 'Foto',
    photoOfOf: 'de',
    oldest: 'Más antigua',
    newest: 'Más reciente',
    retry: 'Reintentar',
    analyze: 'Analizar este punto',
    statusIdle: 'Elige un destacado o busca cualquier estrella.',
    searchToggle: 'Buscar',
    sheetExpand: 'Desplegar panel',
    sheetCollapse: 'Plegar panel',
    progress0: 'Consultando IRSA…',
    progress1: 'Leyendo imágenes del archivo…',
    progress2: 'Alineando visitas a una cuadrícula común…',
    progress3: 'Construyendo la serie temporal…',
    progress4: 'Sigue trabajando — el primer análisis puede tardar ~20 s…',
    returnTo: 'Volver a',
    closeDrawer: 'Cerrar',
    expandCutout: 'Ampliar recorte',
    closeCutout: 'Cerrar recorte',
    pointTitlePrefix: 'Punto RA',
    whatAmISeeing: '¿Qué estoy viendo?',
    introNext: 'Siguiente',
    introSkip: 'Saltar',
    introDone: 'Entendido',
    introStep1: 'Esto es el cielo real, fotografiado por el telescopio SPHEREx de la NASA.',
    introStep2: 'Elegimos un objeto y pasamos sus fotos a lo largo del tiempo.',
    introStep3: 'Busca lo que se mueve o cambia de brillo: eso es lo que cambió.',
    changeMotion:
      'En estas {n} fotos, {name} se desplazó ≈ {px} píxeles (≈ {arcsec} segundos de arco).',
    changeBrightness: 'En estas {n} fotos, su brillo cambia.',
    changeShort: 'Aún no hay fotos suficientes para medir un cambio.',
    changeGeneric: 'Las fotos muestran una diferencia aparente.',
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

export function targetDescription(lang: Lang, slug: string): string {
  const table = TARGET_DESC[lang] as Record<string, string>;
  return table[slug] ?? '';
}

export function formatPointTitle(lang: Lang, ra: number, dec: number): string {
  return `${t(lang, 'pointTitlePrefix')} ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°`;
}

export function returnLabel(lang: Lang, name: string): string {
  return `${t(lang, 'returnTo')} ${name}`;
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

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}
