# Revisión de las cinco regiones del reto

14-nov-2026 · Mateo + Claude Code · Base: `main` en `03e264a` (PR #17, Copernix) · **Revisión; no se cambió la interfaz.** Mismas reglas para las cinco: semáforo de `AGENTS.md` §1, criterios de [0010](../../specs/0010-analysis-result.md) (R10 saturación, R11 SNR ≥ 5) y mensajes de [0034](../../specs/0034-controles-casos-y-limites.md) §«Mensajes del producto».

## Lo más urgente (Copernix, el visor de la demo)

El bloque **«What changed? / ¿Qué cambió?»** de Copernix afirma cambios que no se midieron. Lo genera `frontend/copernix/src/explain-i18n.ts:148-178` (`describeChangeLineI18n`):

1. Si el **movimiento esperado** del catálogo es ≥ 0,3 px, dice que el objeto **«shifted by / se desplazó»** esa cantidad. Es una predicción de Gaia o de Luhman & Esplin, no algo medido en las fotos.
2. Si no, dice **«its brightness changes / su brillo cambia»**. La condición `series.comparability.level.length > 0` (línea 168) siempre es verdadera, así que esta frase sale para **cualquier región**, también para las que elige el usuario.

Esto choca con la regla dura 2 de `AGENTS.md` («la app nunca afirma un descubrimiento»; prohibido fabricar resultados) y con el semáforo («Observado» = diferencia aparente, no medida). Además, Copernix no muestra los controles de comparabilidad (`flags_clear_at_target` y los demás) ni avisa de la saturación.

| Región | Texto actual en Copernix (EN, capturado el 14-nov) | Problema |
| --- | --- | --- |
| Barnard | «Across these 3 photos, Barnard's Star shifted by ≈ 1.7 pixels (≈ 10.2 arcseconds).» | Es el movimiento esperado. La estrella está saturada y su núcleo está oculto en las 3 fotos: no se midió nada. |
| ε Indi B | «Across 4 passes, Epsilon Indi B shifts 6.6″ toward the southeast in 1.4 years (≈ 4.6″ a year). Not independently verified yet.» | Viene de un resultado real (`analysis-result.json`, ajuste de 4 pasadas en D3). Pero **no coincide** con el caso D3 del PR #16 (6,05″, «Observed · motion candidate»), que Copernix no muestra. Hay que decidir una cifra. |
| WISE 0855 | «Across these 2 photos, WISE 0855-0714 shifted by ≈ 0.8 pixels (≈ 5.0 arcseconds).» | **Falso:** WISE 0855 no se detecta y la fuente junto al anillo se queda fija (ver abajo). El cajón de detalles dice «Expected motion ≈ 0.8 px (5.0″)»: la misma cifra. |
| RW Aur | «Across these 2 photos, its brightness changes.» | No se midió el brillo. La estrella está por encima del límite lineal y tiene píxeles ocultos en la foto 2. |
| R Dra | «Across these 3 photos, its brightness changes.» | No se midió. El núcleo está saturado y oculto en las 3 fotos (se ve negro en la captura). |

Capturas: `copernix-<región>.png` y `copernix-<región>-details.png` en esta carpeta. Los textos exactos están en `copernix-what-changed.json`.

## Tres preguntas distintas

| Región | ¿Hay imágenes de la región? | ¿Se detecta el objeto? | ¿Se midió un cambio? |
| --- | --- | --- | --- |
| Estrella de Barnard | Sí: 3 visitas D1 | **No utilizable:** núcleo enmascarado en las 3 visitas (saturación) | No |
| ε Indi B | Sí: 4 visitas D2 y fotos D3 | **Sí** | **Sí, como candidato (Observado):** ajuste de 4 pasadas D3 (6,6″) y par D3 (6,05″) |
| WISE 0855 | Sí: 2 visitas D1 | **No:** la luz junto al anillo no sigue el movimiento esperado | No |
| RW Aurigae | Sí: 2 visitas D1 | Visible, pero por encima del límite lineal y con el núcleo parcialmente enmascarado en la visita 2 | No |
| R Draconis | Sí: 3 visitas D1 (7 rechazadas por borde) | **No utilizable:** núcleo enmascarado en las 3 visitas (saturación) | No |

## Tabla por región

«Copernix hoy» se capturó con la API local; las fechas y λ de la API coinciden con `frontend/public/demo/*/series.json`. El visor anterior (`frontend/src/app`) muestra en las cinco «Images show an apparent difference.» y la nota de núcleos saturados.

| Región | Copernix hoy | Observaciones disponibles | Qué se puede afirmar | Controles que faltan | Texto propuesto (inglés) | Fuentes |
| --- | --- | --- | --- | --- | --- | --- |
| **Estrella de Barnard** | «shifted by ≈ 1.7 pixels (≈ 10.2 arcseconds)» · Observed · núcleo negro. | D1, λ 1,017 µm (Δλ máx 5,1 nm). 2025-09-01, 2026-03-11, 2026-08-25 (DR1+QR3). 0 rechazadas. | Hay imágenes reales de la región. El objeto **no se puede medir** en ellas: los 21 píxeles a ≤ 2,5 px de la posición esperada están enmascarados en las 3 visitas. Su movimiento conocido viene de Gaia, no de estas imágenes. | Saturación sobre píxeles nativos y bits `FLAGS`; método para estrellas saturadas (no existe en el MVP); par auditado (0034). | «SPHEREx observed this region three times. Barnard's Star is too bright for the detector: the pixels at its position are saturated and hidden, so its motion cannot be measured in these images. Its known motion of about 10″ per year comes from the Gaia catalogue.» | `barnards-star/series.json` (`flags_clear_at_target` FAIL en [0,1,2]); comprobación de píxeles (abajo); 0010 B.4 (K = 4,52 → ≈ 6,4 AB frente a ≈ 11,3 AB); `STATE.md` («Barnard, RW Aur y R Dra saturan»); 0034:29 |
| **ε Indi B** | «Across 4 passes… shifts 6.6″ toward the southeast in 1.4 years… Not independently verified yet.» · Observed. El caso D3 (6,05″) solo está en el visor anterior. | D2, λ 1,336 µm, 4 visitas 2025-04-27 → 2026-10-01; 1 rechazada (`near_detector_edge`). D3: ajuste de 4 pasadas (`analysis-result.json`, 517 días) y par 2025-06-10 (DR1) / 2026-09-28 (QR3). | **Detectado** en todas las imágenes (D2: pico 150–278 veces el ruido local de la imagen mostrada; D3: SNR 95–163, 0010 B.2). Movimiento **candidato (Observado)**: 6,6″ del ajuste D3 (`threshold_exceeded_unverified`) y 6,05″ del par D3 tras corregir paralaje. Son medidas distintas del mismo movimiento; no se contradicen, pero la app debe decir cuál muestra. | Incertidumbre provisional; posible mezcla Ba/Bb; recuperación inyectada (0034 §2). D2: visita 4 con 4/19 píxeles enmascarados. **Decisión de Sebastián:** qué cifra se muestra. | Ajuste: «Across 4 passes in detector D3, the centre of light of Epsilon Indi B shifts 6.6″ toward the southeast in 1.4 years. Observed · motion candidate: not independently verified.» Si se elige el par: el texto del caso D3, sin cambios. | `epsilon-indi-b/analysis-result.json`; `epsilon-indi-b-d3/case.json`; 0010 B.2; specs 0036–0038; `motion-analysis.ts:137` |
| **WISE 0855** | «shifted by ≈ 0.8 pixels (≈ 5.0 arcseconds)» · Observed · anillo junto a una mancha brillante. | D1, λ 0,968 µm, 2025-10-31 y 2026-05-04; 1 rechazada (`wavelength_mismatch`, 24,3 nm). | Hay imágenes reales. **WISE 0855 no se detecta:** la fuente junto al anillo se desplaza 0,3″ entre visitas, mientras la posición esperada se desplaza 5,0″. Se comporta como una fuente fija del fondo. Coincide con 0010 B.4: SNR de 0 a 4,7 incluso en D5/D6, donde más brilla. | Identificar la fuente fija con un catálogo [VERIFICAR]; verificar la efeméride (0031 usa otra posición, de CatWISE); detectar el objeto solo sería posible con apilado [VERIFICAR] o en otra banda. | «SPHEREx observed this region twice, but WISE 0855 is too faint to detect in a single image at this wavelength. The ring marks where it is expected. The light next to the ring stays in place between the two dates, so it is probably a different source. No change can be measured here.» | `wise-0855/series.json`; comprobación de movimiento (abajo); 0010 B.4 y R-4; 0031; 0034:28; `STATE.md` (demo vieja sin WISE 0855) |
| **RW Aurigae** | «its brightness changes» · Observed. En la foto 2 el núcleo pierde píxeles. | D1, λ 0,965 µm, 2025-09-04 y 2026-03-06; 1 rechazada (`wavelength_mismatch`, 9,2 nm). 0010 B.1 cuenta 3 pasadas; la app muestra 2. | Hay imágenes reales y la estrella es visible, pero es **más brillante que el límite de respuesta lineal**. En la visita 2 hay 5/21 píxeles enmascarados. El pico baja de 47,9 a 18,3 MJy/sr y el centro aparente se mueve 4,7″ cuando se esperan 0″: ambas cosas coinciden con los píxeles ocultos. **Estos datos no establecen un cambio de brillo.** | Fotometría con método fijado (0011 tarea 10); bits de saturación/no linealidad en píxeles nativos; calibración y λ local (0034); recuperar la 3.ª pasada. | «SPHEREx observed this region twice. RW Aurigae is brighter than the level at which the detector responds linearly, and some pixels at its position are hidden in the second image. The difference you see can be caused by those hidden pixels. These data do not establish a brightness change.» | `rw-aurigae/series.json` (`flags_clear_at_target` FAIL en [1]); comprobación de píxeles (abajo); 0010 B.4 (K = 7,02 → ≈ 8,9 AB); `STATE.md`; 0034:30 |
| **R Draconis** | «its brightness changes» · Observed · núcleo negro en las 3 fotos. | D1, λ 0,964 µm, 2025-07-07, 2025-10-19, 2026-07-14; 7 rechazadas (`near_detector_edge`). | Hay imágenes reales. El objeto **no se puede medir**: los 21 píxeles a ≤ 2,5 px están enmascarados en las 3 visitas. Su variabilidad conocida no se puede comprobar con estas imágenes. | Igual que Barnard; además, una variable no saturada como caso de brillo (0010 anexo C, «falta candidato»). | «SPHEREx observed this region three times. R Draconis is far too bright for the detector: the pixels at its position are saturated and hidden in every image, so its brightness changes cannot be measured here.» | `r-draconis/series.json` (`flags_clear_at_target` FAIL en [0,1,2]); comprobación de píxeles (abajo); 0010 B.4 (K = 2,44 → ≈ 4,3 AB, «muy saturada»); `STATE.md`; 0034:31 |

**Región elegida por el usuario (cualquier otra):** hoy Copernix dirá «its brightness changes» o «shifted by» según el catálogo. Texto propuesto cuando no hay medición: «A visual difference may be visible. Its cause has not been established.» (0034:46).

## Comprobaciones hechas en esta revisión

Se usaron los cuadros que muestra la app (`frontend/public/demo/<región>/frame-N.f32`, rejilla común TAN de 6,15″/px con interpolación bilineal) y la posición esperada de cada `series.json`. **Es una inspección de la imagen mostrada, no fotometría ni astrometría.** «Pico/ruido» compara el píxel más brillante a ≤ 2,5 px con la mediana y la dispersión robusta (MAD) en un anillo de 6–15 px: no es el SNR de R11.

| Región | Visita | Píxeles enmascarados ≤ 2,5 px | Pico (MJy/sr) | Pico / ruido local |
| --- | --- | --- | --- | --- |
| Barnard | 2025-09-01 · 2026-03-11 · 2026-08-25 | 21/21 · 21/21 · 21/21 | — | — |
| ε Indi B (D2) | 2025-04-27 · 2025-10-06 · 2026-04-25 · 2026-10-01 | 0/19 · 0/21 · 0/21 · 4/19 | 6,27 · 5,52 · 5,56 · 4,52 | 172 · 278 · 150 · 190 |
| WISE 0855 | 2025-10-31 · 2026-05-04 | 0/19 · 0/19 | 0,48 · 0,34 | 34 · 25 |
| RW Aur | 2025-09-04 · 2026-03-06 | 0/21 · 5/21 | 47,9 · 18,3 | 1705 · 620 |
| R Dra | 2025-07-07 · 2025-10-19 · 2026-07-14 | 21/21 · 21/21 · 21/21 | — | — |

Desplazamiento del centro aparente (centroide ponderado 5×5, sin ajuste de PSF ni incertidumbre) frente al esperado, de la primera a la última visita:

| Región | Esperado | Centro aparente | Lectura |
| --- | --- | --- | --- |
| ε Indi B (D2) | 6,5″ | 5,5″ | Compatible a simple vista; no es una medición. |
| WISE 0855 | 5,0″ | 0,3″ | La fuente no sigue el movimiento de WISE 0855: es otra fuente. |
| RW Aur | 0,0″ | 4,7″ | El centro se desplaza por los píxeles ocultos de la visita 2, no por movimiento. |

Los scripts de comprobación (`target_pixels.py`, `peak_motion.py`) y el de capturas (`copernix-shots.mjs`) se ejecutaron fuera del repo; se pueden agregar a `scripts/` si el equipo quiere repetirlos.

## Cambios propuestos para la UI (dueños: Daniel/Dax; textos con visto bueno de Sebastián)

1. **Copernix, `describeChangeLineI18n`:** no decir «shifted by» con el movimiento esperado ni «brightness changes» sin medición. Usar el texto de la tabla por región y, si no hay medición, el de 0034:46.
2. **Mostrar la saturación** cuando `flags_clear_at_target` falla (hoy Copernix no la menciona y el visor anterior la menciona siempre).
3. **Anillo:** «predicted position; the object may not be detected in these images» (0035), sobre todo en WISE 0855.
4. **ε Indi B:** una sola cifra en Copernix, ficha (`docs/pitch/ficha-proyecto.md` dice 6,6″) y pitch, con la etiqueta «Observed · motion candidate».
5. Visor anterior: `change_significance` aparece como `FAIL` sin estar calculado (`time-panel.tsx:313`), y el regreso desde D3 carga D2 grabado (`app.tsx:396`).

## Límites de esta revisión

- No se descargaron FITS nativos; los recuentos de máscara se hicieron en la rejilla de visualización.
- La identidad de la fuente fija junto a WISE 0855 no se comprobó con un catálogo [VERIFICAR].
- La etiqueta «Luhman & Esplin 2016» y los valores de movimiento de WISE 0855 en `series.json` (−8118 / +680 mas/año, época 2010,34) no se contrastaron con el artículo [VERIFICAR].
- Ninguna fila sube de «Observado». El software nunca asigna «Confirmado».
