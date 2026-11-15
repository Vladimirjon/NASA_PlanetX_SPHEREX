# Landing: retratos animados y comparador (revisión)

- Fecha: 15-nov-2026
- Commit revisado: `92b4406` (`feat: refine landing comparisons and animated portraits`)
- Alcance: página principal (`landing/`). El visor (`/viewer/`) no cambia en este commit.

## Qué cambia

- La galería «Five objects to try» pasa después del ejercicio interactivo y antes del CTA final.
- Los cinco objetos usan retratos PNG transparentes con un giro axial ilustrativo en WebM (800 px, 60 fps).
- Nuevo botón «Pause rotation» / «Resume rotation»; el giro se detiene con `prefers-reduced-motion`, con la pestaña oculta y al salir de pantalla.
- El comparador recupera el barrido por scroll y el arrastre, con suavizado y la línea limitada bajo el título.
- Textos ES/EN ajustados (luz infrarroja, etiqueta «AI illustration») y prueba de navegador actualizada al nuevo orden de secciones.

## Revisión de código

- `syncPortraits()` centraliza las condiciones de reproducción; los vídeos son `aria-hidden` y el texto alternativo de la imagen ya declara que es una ilustración de IA.
- El observer se desconecta al reconstruir la galería y los vídeos se pausan antes de reemplazar el DOM.
- `mark()` conserva su comportamiento por defecto al añadir el grosor de línea; el comparador reinicia el suavizado al salir de la sección.
- Sin hallazgos bloqueantes. La revisión visual humana del resultado sigue pendiente, como indica `docs/STATE.md`.

## Comprobación ejecutada

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Validación estática, recursos, paridad ES/EN | `node scripts/check-landing.mjs` | PASS |
| Pruebas del planificador de render | `node tests/landing/render-scheduler.test.mjs` | 7/7 |
| Pruebas del satélite | `node tests/landing/satellite.test.mjs` | 5/5 |
| Paquete estático | `node scripts/build-landing.mjs` | 1666 archivos, 26 MB; `viewer/` omitido sin build |
| Recorrido completo en Chromium | `node tests/landing/browser-smoke.cjs` | PASS: scroll, comparador, satélite, movimiento reducido, espectro, timeline, idioma y móvil; sin errores ni peticiones ≥ 400 |
| Comparador y retratos | `node tests/landing/compare-portraits.cjs` | PASS: scroll y teclado, giro con pausa, movimiento reducido y móvil |

Servidor usado para las pruebas: `python3 scripts/serve_landing.py 4412` desde este worktree, con `LANDING_URL=http://127.0.0.1:4412/`.

## Evidencia

- `hero.png`: portada.
- `compare.png`: comparador en el punto medio.
- `portraits.png`: galería con giro y pausa.
- `compare-mobile.png`: comparador en 390×844.

Las capturas se generaron con Chromium headless sin GPU física. La revisión visual final y la aprobación humana quedan pendientes.
