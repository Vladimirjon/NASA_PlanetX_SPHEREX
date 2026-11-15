> Histórico: este rediseño fue rechazado y revertido. Estado actual: [restauración](2026-11-14-restored.md).

# Landing premium y estabilidad · 2026-11-14

## Hallazgo del congelamiento

El journal del arranque anterior, leído sin modificar el sistema, registra:

```text
GPU HANG: ecode 12:1:878afaf0, in chrome
Fence expiration time out ... QSGRenderThread
Failed to reset chip
```

Controlador: Intel i915. El bloqueo alcanzó el subsistema gráfico del escritorio, consistente con que dejara de responder incluso el mouse. [Extracto del journal, UTC](gpu-hang-evidence.txt).

Esto confirma el fallo del sistema gráfico durante Chrome, no la llamada exacta de la landing que lo disparó. No se reprodujo el cuelgue sobre la GPU física ni se cambió el controlador, kernel o configuración global del navegador.

## Cambios aplicados

- Se retiraron del grafo activo Three.js, WebGLRenderer, PMREM y la carga del modelo. Los archivos anteriores siguen conservados en el repositorio.
- Se eliminaron el canvas de fondo, ruido fractal, animación de estrellas, backdrop blur y bucle requestAnimationFrame permanente.
- El renderizador atiende eventos; solo el playback solicitado programa fotogramas, con intervalo mínimo de 50 ms. Pausa al salir de la sección, ocultar la pestaña o cambiar la preferencia de movimiento.
- Canvas explicativos limitados a ~0,9 MP, sin escalado por DPR; contexto 2D con indicación willReadFrequently. El navegador decide la ruta final de rasterización.
- Dos ilustraciones IA nuevas con marca de agua y una imagen oficial de NASA/JPL-Caltech. Composición editorial, textos claros, vista de proyector y ES/EN. Los esquemas se distinguen de los datos científicos.
- Los CTA principales abren la demo disponible. El visor real sigue en desarrollo; no se presenta como implementado.

## Verificación ejecutada sobre el repo y el paquete

| Prueba | Resultado |
| --- | --- |
| node scripts/check-landing.mjs | PASS: sintaxis, referencias locales, paridad ES/EN, sin WebGL en módulos activos y sin backdrop filters |
| node tests/landing/render-scheduler.test.mjs | 5 pruebas aprobadas |
| ESLint 10.9.1, configuración landing/eslint.config.mjs | 0 errores y 0 avisos en los tres módulos activos |
| node scripts/build-landing.mjs | 20 archivos, 502 KiB en dist/landing |
| Playwright 1.62.1 contra dist/landing | CTA, play/pause, scrub, mostrar respuesta, pausa al ocultar/salir, comparación, bandas, pestañas y ES/EN aprobados |
| Instrumentación en reposo | 0 callbacks de animación durante la ventana medida de 1 s |
| Instrumentación GPU/red | 0 solicitudes WebGL; 0 descargas de modelo o Three.js |
| Consola y recursos | 0 errores JS; 0 respuestas HTTP fallidas |
| axe-core 4.10.3 | 0 violaciones WCAG 2 A/AA y 2.1 AA detectadas en escritorio oscuro/claro, móvil y movimiento reducido |
| Desbordamiento horizontal | Ninguno a 1440 px y 390 px |
| git diff --check | PASS |

La prueba estática de inicialización GPU se ejecutó primero contra la versión anterior: falló en sat3d.js por WebGLRenderer. La versión nueva pasa. Se evitó ejecutar la versión anterior sobre la GPU del equipo.

Lighthouse 13.0.1 sobre el paquete final, simulación móvil: **rendimiento 98/100**, accesibilidad 100/100, buenas prácticas 100/100, SEO 100/100. LCP 2.2 s; TBT 10 ms; CLS 0.057. Son mediciones locales, no garantías de rendimiento en todos los dispositivos.

[Resultados funcionales](qa/qa-results.json) · [Resumen Lighthouse](qa/lighthouse-summary.json).

## Revisión visual y límites

Se inspeccionaron las capturas de escritorio/móvil y la sección de misión/objetos. Se mantuvieron los tokens del equipo, tipografías locales, contraste, jerarquía de títulos, foco, dimensiones de imagen y atribuciones. Se corrigieron el tooltip vacío, un botón anidado en summary y el favicon ausente. Sin hallazgos altos en estas comprobaciones. La revisión humana de diseño y ciencia sigue pendiente.

El diseño conserva intencionalmente una presentación oscura/cinematográfica por la solicitud de Daniel; la vista clara sirve las secciones de lectura con fondo claro. No se alteró el contrato del futuro visor científico.

Capturas finales: [escritorio](qa/qa-dark.png), [móvil ES](qa/qa-mobile.png), [método en vista clara](qa/qa-light.png), [movimiento reducido](qa/qa-reduced.png).

## Repetir las pruebas

Los controles estáticos, tests del planificador y build usan Node 22+ sin paquetes. El smoke test requiere Playwright 1.62.1 y axe-core 4.10.3 disponibles en el entorno; no se agregaron dependencias al runtime de la landing.

El script tests/landing/browser-smoke.cjs acepta LANDING_URL, PLAYWRIGHT_MODULE, AXE_PATH, CHROME_PATH y TEST_OUTPUT_DIR. Por defecto usa http://127.0.0.1:4410/, playwright y axe-core instalados en el entorno y guarda en test-results/landing/. Siempre lanza el navegador aislado con aceleración GPU y WebGL desactivados.

## Alcance del arreglo

Se mitigaron las rutas costosas de la página y se verificó su comportamiento. El fallo i915 es del sistema: estas pruebas no demuestran que el controlador haya quedado reparado ni garantizan que otras páginas no lo disparen.
