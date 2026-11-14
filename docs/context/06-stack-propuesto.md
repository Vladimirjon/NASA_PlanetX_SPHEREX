# 06 · Stack técnico propuesto (bajo y alto nivel)

> **Recomendación, no obligación.** Cada persona, con su agente, puede elegir otro stack o herramientas para su módulo si respeta los contratos con los demás, deja un ADR con el motivo y documenta cómo correrlo en Fedora y Windows (ver `AGENTS.md` §3).

Estado: **PROPUESTA** para que el equipo apruebe (luego ADR 0003). Versiones consultadas el 14-nov-2026 con `npm view` y la API JSON de PyPI. **No se hicieron benchmarks**: las latencias son estimaciones.

## 1. Idea central en una frase

**La ciencia pesada se hace en Python (backend). El navegador queda liviano:** recibe matrices de números `Float32` ya alineadas y las dibuja con la GPU (WebGL2). Los 5 objetos de demo se precalculan como archivos estáticos que funcionan sin internet.

¿Por qué? Cada época tiene otra orientación y deformación (WCS TAN-SIP). Para restar imágenes hay que **reproyectarlas a una rejilla común**. Astropy y reproject lo hacen bien; hacerlo correctamente en JavaScript sería un proyecto de investigación.

## 2. Flujo de datos

```
Navegador (SPA React, Service Worker con la demo precargada)
  │ URL ?ra&dec&fov  ──► TanStack Router (parámetros validados)
  │ GET /api/epochs?ra&dec         ──► FastAPI ──► IRSA SIA2 (pyvo) ──► caché en disco
  │ GET /api/cutout/{obs}?grid=…   ──► FastAPI ──► S3 nasa-irsa-spherex (lectura por rangos)
  │                                      └─ astropy WCS (SIP) + reproject → rejilla común
  │   ◄── binario Float32 + metadatos (forma, fecha MJD, λ, WCS local)
  │ GET /api/gaia, /api/sbident    ──► FastAPI proxy (esas APIs no tienen CORS), con caché
  │ respaldo: /demo/{objeto}/*.f32 + manifest.json (estático, precargado)
  ▼
Web Worker: estadísticas (percentiles para el contraste)
Hilo principal: texturas WebGL2 R32F por época → shader: contraste → paleta; diferencia; compuesto
  Blink a 1–2 Hz = cambiar una textura (sin trabajo de CPU); zoom sin suavizado
Gráficas: Observable Plot (curva de luz, espectro)   ·   Contexto: Aladin Lite
```

## 3. Decisiones por capa

| Capa | Propuesta | Versión | Por qué | Alternativa | Descartado (motivo) |
| --- | --- | --- | --- | --- | --- |
| Dibujo de imagen | **WebGL2 propio** (~150 líneas) o twgl.js | twgl.js 7.0.0 | Texturas float con vecino más cercano son nativas; paleta = textura 256×1; diferencia y compuesto en el shader; funciona en cualquier laptop | Canvas2D (CPU, < 2 ms para 256 px) como respaldo | WebGPU: Firefox Linux y Mac Intel aún sin soporte por defecto; regl abandonado; OGL orientado a 3D |
| FITS y WCS | **Servidor**: astropy + fsspec (lectura parcial) + reproject | astropy 8.0.2 · reproject 0.21.0 · numpy 2.5.4 | Maneja SIP exacto; la diferencia necesita reproyección | jsfitsio 3.1.0 solo para vista rápida de una época | fitsjs (sin mantenimiento desde 2022), astrojs (juguete), wcslib en wasm (sin paquete mantenido) |
| Formato de envío | **Float32 binario** (`application/octet-stream`) + metadatos JSON | — | Va directo a la GPU sin copiar; 64×64 px = 16 KB | `.npy` | base64 en JSON (+33 % y lento), PNG16 (pierde float/NaN), Arrow (+150 KB) |
| Trabajo pesado en cliente | Web Worker + comlink | 4.4.2 | No congela la interfaz | — | — |
| Offline | vite-plugin-pwa (Workbox) | 2.0.0 | La demo no depende del wifi del coliseo | Solo cabeceras `immutable` | Service Worker a mano |
| Framework | **React 19 + Vite + TypeScript** (SPA estática) | react 19.3.1 · vite 8.3.8 | Mayor ecosistema y lo que mejor conocen los agentes; no necesitamos SSR | SvelteKit | Next.js (SSR innecesario), Astro (es una sola vista densa) |
| TypeScript | **6.x** | fijar al instalar | TS 7.0 (compilador en Go) salió hoy; compatibilidad de plugins sin verificar | — | TS 7 por ahora |
| Estado en URL | TanStack Router + zod/valibot | 1.170.46 | Cada vista es un enlace compartible y validado | React Router 7 | — |
| Datos remotos | TanStack Query (+ openapi-react-query) | 5.107.1 | Caché, reintentos, cancelación, precarga de la siguiente época | SWR | — |
| Estado local | Zustand | 5.1.0 | Simple; funciona con el bucle de animación | Jotai | Redux (ceremonia) |
| Componentes accesibles | **Base UI** (sin estilos) | @base-ui/react 1.9.0 | Accesible, activo, sin "look" impuesto | React Aria Components 1.22.1 | Radix (mantenimiento más lento) |
| Estilos | **Tailwind v4** con tokens propios en `@theme` | 4.3.5 | Rápido para agentes; los tokens fuerzan un look formal | CSS Modules | vanilla-extract (complejidad) |
| Iconos | Lucide | lucide-react 1.73.0 | Trazo uniforme, activo | Phosphor | — |
| Tipografía | **IBM Plex Sans** + **IBM Plex Mono** para coordenadas y números; `tabular-nums` | @fontsource 5.3.0 | Tono científico e ingenieril; se sirve local (offline) | Inter + JetBrains Mono | Geist (asociada al look por defecto de IA/Vercel) |
| Gráficas | **Observable Plot** (SVG) | 0.6.19 | Barras de error, ejes log, facetas por detector; texto accesible; exportable a slides | uPlot 1.6.32 (canvas, más rápido) | ECharts/Plotly (~1 MB, look genérico), visx (lento de construir), Vega-Lite (pesado) |
| Mapa del cielo | Aladin Lite | 3.9.2-beta (fijar exacto) | Visor HiPS citado por el reto | PNG estático de respaldo | — |
| Backend | **FastAPI** + uvicorn + pydantic + httpx + pyvo | 0.163.0 · 0.54.0 · 2.14.3 · 0.28.1 · 1.10.0 | OpenAPI automático; pyvo es el cliente VO mantenido | Litestar | Starlette pelado; astroquery (no hace falta) |
| Caché servidor | diskcache + `Cache-Control: immutable` | 5.6.3 | Sin Redis | LRU en memoria | Redis (otro servicio) |
| Errores API | RFC 9457 `application/problem+json` | — | Estándar; la UI traduce `type` a mensaje | — | Formatos ad hoc |
| Tipos API | openapi-typescript + openapi-fetch | 7.13.0 · 0.17.0 | Solo tipos, ~6 KB de runtime | hey-api (aún 0.x) | orval |
| Hosting frontend | **Cloudflare Pages** | — | CDN global, cabeceras propias (caché, CSP) | GitHub Pages (sin cabeceras propias) | Vercel (términos de uso comercial en el plan gratuito) |
| Hosting backend | **[DECIDIR]** Google Cloud Run (2 GiB) **o** Hugging Face Spaces Docker | — | Cloud Run: plan gratuito amplio, arranque en frío ~3–8 s, **pero pide cuenta de facturación (tarjeta)**. HF Spaces: 16 GB RAM, sin tarjeta, pero en 2026 hay quejas en el foro sobre el plan gratuito | — | Render free (512 MB, no alcanza para reproject), Fly.io (sin plan gratuito para cuentas nuevas) |
| Tests | Vitest · Playwright (capturas + axe) · pytest + hypothesis | 5.1.0 · 1.65.1 · 9.2.0 · 6.170.15 | Matemática de contraste y diferencia; regresión visual; ida y vuelta píxel↔cielo | — | — |

## 4. Presupuesto de rendimiento

| Métrica | Meta |
| --- | --- |
| JS inicial (gzip) | ≤ 180 KB; Aladin y Plot se cargan después del primer fotograma |
| LCP (demo precargada) | < 2,5 s |
| Primer fotograma con datos en vivo | < 3 s con caché; < 6 s en frío |
| Recorte por época | ≤ 64 KB comprimido |
| Fotograma del blink | < 4 ms de GPU, sin reservar memoria |
| Backend p95 | < 300 ms con caché; < 2 s sin caché |
| RAM del backend | < 1,5 GB (siempre leer con `.section`, nunca el HDU completo) |

## 5. Riesgos

1. **Arranque en frío o wifi malo durante el jurado** → la demo es la pantalla inicial, estática y precargada; despertar el backend 5 min antes; video grabado como último recurso.
2. **Espectro mal interpretado** → la λ de cada píxel sale de la extensión `WCS-WAVE`, no de una constante por imagen. Validar temprano con quien lleve ciencia.
3. **Artefactos en la diferencia** (PSF distinta, apuntado) → etiquetar "tras reproyección", ofrecer máscara de bordes/NaN y nunca afirmar detecciones (semáforo).
4. **Aladin Lite en React** → inicialización asíncrona; StrictMode crea dos instancias: guarda con `ref`, destruye al desmontar, versión exacta (es beta).
5. **Límites y latencia de IRSA, Gaia y JPL** → caché con TTL largo, timeouts, errores RFC 9457, precalentar los 5 objetos.
6. **Pérdida del contexto WebGL en el proyector** → manejar `webglcontextlost` y caer a Canvas2D.
7. **Capturas de Playwright inestables entre GPUs** → umbral `maxDiffPixelRatio` y Chromium fijo en CI.

## 6. Pendiente de verificar antes del ADR

Términos actuales del plan gratuito de Cloud Run y HF Spaces; estado de mantenimiento de Base UI vs Radix; tamaños exactos de Plot y uPlot.

## Fuentes

Registro npm y PyPI (14-nov-2026) · [web.dev: WebGPU](https://web.dev/blog/webgpu-supported-major-browsers) · [Ecosistema WebGPU 2026](https://www.youngju.dev/blog/culture/2026-05-16-webgpu-wgsl-ecosystem-2026-chrome-safari-firefox-wgpu-naga-tint-three-js-babylon-webllm-transformers-deep-dive.en) · [HF Spaces](https://huggingface.co/docs/hub/en/spaces-overview) · [Foro HF sobre CPU Basic](https://discuss.huggingface.co/t/official-community-complaint-revert-free-cpu-basic-spaces-and-remove-anti-developer-sdk-restrictions/177703) · [Estado del hosting gratuito 2026](https://snapdeploy.dev/state-of-free-hosting) · [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) · Docs de astropy (`use_fsspec`, `.section`) y reproject 0.21.
