# R4 — Revisión de ciencia y coherencia del motor del cielo (rama `feat/sky-engine`)

**Veredicto: CAMBIOS REQUERIDOS**

Un bloqueante: el cielo se muestra **en espejo** (este a la DERECHA con el norte arriba). Lo demás que pide la ciencia está bien: HEALPix, proyecciones, orientación dentro de la tesela, precisión del clic y λ por plano. Hay que arreglar el espejo, los planos vacíos 50/51 y el formato sexagesimal antes de mergear.

Revisor: R4 (ciencia y coherencia), 2026-11-14, sobre `0e5126f`. Comprobaciones con código propio (astropy 8.0.2, astropy-healpix 1.1.3, numpy 2.5.4, Gaia DR3 por TAP de ESA, Playwright 1.65.2 + Chromium 1228). Scripts fuera del repo (scratch de la sesión R4: `gen_inputs.py`, `engine-dump.test.ts`, `compare.py`, `tile.py`, `centroid.py`, `e2e2.py`, `drag.py`, `status.py`).

## Resumen de resultados

| # | Comprobación | Resultado |
| --- | --- | --- |
| 1 | HEALPix `ang2pix`/`pix2ang`/`corners`, 12 010 puntos, órdenes 0–5 vs astropy-healpix | OK: 12 008/12 010 iguales; los 2 distintos son vértices exactos (empates). Centros y esquinas: máx. 3,2·10⁻¹⁰″ |
| 1b | ¿Fixtures circulares? | OK: no. `scripts/generate-sky-engine-fixtures.py` usa solo astropy-healpix; lo regeneré y los 5 archivos tienen el **mismo SHA-256** que los del repo |
| 2 | SIN/TAN/AIT vs `astropy.wcs`, 5 centros × 1000 puntos × 3 proyecciones | Magnitud OK (máx. 1,3·10⁻¹³°), **pero el signo de x está invertido** respecto al WCS estándar (CDELT1 < 0) → ver B1 |
| 3 | Clic sobre estrella → RA/Dec vs Gaia DR3 (tope 12,9″) | OK: 1,86″ / 2,58″ / 8,05″ (centroide en pantalla). Centro mostrado = URL: ≤ 0,02″ |
| 3b | Orientación dentro de la tesela (`x PNG ↔ dy`, `fila ↔ dx`) | OK: 282 estrellas Gaia en 4 teselas, desvío medio ≤ 0,07 px, mediana 0,20–0,25 px. Las otras 7 orientaciones posibles son claramente peores |
| 4 | Norte arriba ⇒ este a la IZQUIERDA | **FALLA** (B1) |
| 5 | Plano → λ (0, 19, 49, 50, 51, 52, 101) | Las 102 λ son idénticas a `data_cube_crval3_arr`. Pero los planos 50/51 se ven **rotos** (M1) |
| 6 | Formato sexagesimal | **FALLA**: `59m 60.0s`, `59′ 60.0″`, `360.00000°`, `−0°` (M2) |
| 7 | Textos y afirmaciones | OK: no hay MJy/sr ni afirmaciones de descubrimiento; sí dice "visualization only". Faltan fecha de publicación y créditos (m1) |

## Hallazgos

### B1 — BLOQUEANTE: cielo en espejo (este a la derecha)

**Evidencia**
- `pointAt` (vista `ra=10, dec=20, fov=30, SIN`, lienzo 800×600): el punto de pantalla x=900 (derecha) da RA = 29,99°, más que el centro (10°). La derecha es el este. Con TAN pasa lo mismo: 13,32°.
- En la app, con Pléyades a FOV 1,6° y centro en RA 56,755°: Alcyone (RA 56,871°, al este del centro) sale a la **derecha** (x = 564 px), y el pico de la izquierda (RA 56,203°) está cerca de Electra (al oeste). Atlas y Pleione salen a la derecha del cúmulo; en Aladin y en cualquier carta celeste salen a la izquierda. Captura: `docs/reviews/sky-engine/r4-pleiades-espejo.png`.
- Contra astropy WCS (`CDELT1=-1, CDELT2=+1`, convención astronómica): `x_motor = −x_WCS` en las 15 combinaciones, con error < 1,3·10⁻¹³°. Si se toma `x_motor = +x_WCS`, el error llega hasta 69°.
- Efecto en la interacción (Playwright): al arrastrar 100 px a la derecha, el cielo bajo el puntero cambia de RA 56,531° a 56,947°. Debería quedarse en 56,531° ("agarrar"). En vertical sí lo hace (24,0858° → 24,0658°, diferencia menor que el retraso del arrastre). **Un eje sigue al dedo y el otro va al revés.**
- Los tests no lo detectan porque solo prueban ida y vuelta (`tests/projection.test.ts`, `tests/projection-property.test.ts`), y una imagen en espejo también pasa la ida y vuelta.

**Por qué importa:** la ficha 0003 §1 exige paridad visible con Aladin Lite. Además, una persona que compare con el visor de IRSA, con cartas celestes o con imágenes de prensa verá la región al revés. El clic sigue dando la coordenada correcta, porque el render y `pointAt` cometen el mismo error.

**Archivos**
- `frontend/src/engine/core/tiles/selection.ts:13`: `(2*x/width-1)*scale` hace que la x de pantalla sea +este.
- `frontend/src/engine/adapters/webgl-renderer.ts:37-43`: `e=p.x` (SIN/TAN) y `e=cos(lat)*sin(lon)` (AIT) con `p.x` creciendo a la derecha.
- `frontend/src/engine/core/camera/camera.ts:10-12`: `dx*east` mueve el centro hacia el este al arrastrar a la derecha.

**Arreglo concreto**
1. Shader, justo después de `p*=scale;` (línea 40): `p.x=-p.x;`. Así la pantalla a la derecha es el oeste.
2. `selection.ts:13`: `unproject(projection, (1-2*x/width)*scale, (1-2*y/height)*scale*height/width, …)`.
3. `camera.ts:10-12`: cambiar `dx` por `-dx`, para que el arrastre "agarre" el cielo en los dos ejes. Revisar también qué significan `ArrowLeft`/`ArrowRight` en `adapters/input.ts:27`. Hoy `ArrowDown` sube la vista al norte (dec 24,08° → 24,14°); hay que elegir una sola convención ("mover la vista" o "mover el cielo") para los cuatro ejes.
4. Opcional pero recomendado: definir en `math.ts` que el plano usa x = −este (como FITS) y documentarlo.
5. Test nuevo que no sea de ida y vuelta: un fixture con `astropy.wcs` (`CDELT1<0`) que dé las coordenadas de píxel esperadas, más un test de `pointAt` que diga "x > centro ⇒ RA < RA_centro" (lejos del polo).

### M1 — MAYOR: los planos 50 y 51 (vacíos por diseño) se ven como una falla

**Evidencia:** con `plane=50` o `51`, el lienzo queda negro (media = 0, desviación = 0) y aparece el aviso "Some tiles are unavailable: Tile request failed: 404". Captura: `r4-plano50.png`. IRSA devuelve 404 en todas las teselas. El selector solo añade "· blank", pero la pantalla presenta un error de red. **Además, el aviso no se borra:** al volver al plano 49, sigue diciendo "Tile request failed: 404". Con PageUp/PageDown también se entra a 50/51 sin aviso.

**Fuente:** `properties.obs_description`: "Frames 50 and 51 (band 3 channel 17, band 4 channel 1, the dichroic channels) are blank". También `docs/context/12` §4.1 (`BLANKCH='D3:17,D4:01'`).

**Archivos:** `frontend/src/ui/app.tsx:30` (etiqueta), `frontend/src/engine/engine.ts:48-54` (pide teselas y emite el error), `engine.ts:63` y `adapters/input.ts:30` (salto de plano), `app.tsx:10,19` (el estado nunca se limpia).

**Arreglo**
- Exportar `BLANK_PLANES = [50, 51]` junto a `WAVELENGTHS`, citando `properties`.
- En el motor, no pedir teselas de esos planos y emitir un estado informativo, no un error.
- En la UI, mostrar: "Plane 50 · D3 ch 17 · 2.399 µm — no data in DR1: dichroic transition channel, blank by design (IRSA)".
- Limpiar el aviso de estado cada vez que cambien el plano o la vista.

### M2 — MAYOR: el formato sexagesimal no lleva el acarreo al redondear y no rellena con ceros

**Evidencia** (salida real de `coordinates()` en `frontend/src/engine/core/camera/coordinates.ts:2-4`):

| Entrada | Salida actual | Esperado |
| --- | --- | --- |
| RA 359,9999583 (23h59m59,99s) | `23h 59m 60.0s … (359.99996°)` | `00h 00m 00.0s` |
| RA 359,9999999 | `23h 59m 60.0s … (360.00000°)` | `00h 00m 00.0s … (0.00000°)` |
| RA 0,24999999 | `0h 00m 60.0s` | `00h 01m 00.0s` |
| Dec +10°59′59,9995″ | `+10° 59′ 60.0″ (… 11.00000°)` | `+11° 00′ 00.0″` |
| Dec −0,999999 | `−0° 59′ 60.0″` | `−01° 00′ 00.0″` |
| Dec −0,5 | `−0° 30′ 0.0″` | `−00° 30′ 00.0″` |
| Dec ±90 | `+90° 00′ 0.0″` / `−90° 00′ 0.0″` | correcto, falta rellenar los segundos (`00.0″`) |

El signo de las declinaciones entre 0° y −1° **sí** se conserva (bien). En la app se vio en vivo: `Center 23h 59m 60.0s −0° 00′ 0.4″`.

**Arreglo:** redondear primero al último dígito mostrado, en unidades enteras, y después descomponer. Por ejemplo, `t = Math.round(((ra%360+360)%360)/15*36000) % 864000` (décimas de segundo de tiempo), luego `h = ⌊t/36000⌋`, `m = ⌊t/600⌋%60`, `s = (t%600)/10`. Para Dec, lo mismo con décimas de segundo de arco sobre `|dec|`, con el signo aparte. Rellenar con ceros: `hh`, `±dd`, `ss.s`. Normalizar el decimal: `(((ra%360)+360)%360).toFixed(5)` después de redondear, para que `360.00000` pase a `0.00000`. Agregar tests con los 7 casos de la tabla.

### m1 — MENOR: procedencia incompleta en pantalla

`frontend/src/ui/app.tsx:24` muestra "SPHEREx DR1 HiPS · IRSA · visualization only" y "2025-04-24–2026-05-14 · asinh". Las fechas coinciden con `t_min`/`t_max` (MJD 60789,75 = 2025-04-24; 61174,49 = 2026-05-14). Faltan:
- La fecha de publicación del HiPS: `hips_release_date = 2026-11-01`. La ficha 0003 §3 pide "fuente y fecha del dato".
- Los créditos: `obs_copyright = NASA/SPHEREx`, `hips_copyright = Caltech/IPAC`.
- Aclarar que el rango de fechas es un **coadd**. El HiPS "no es temporal" (`docs/context/12` §4.1). Mostrado solo, el rango puede leerse como una serie en el tiempo, lo que choca con el semáforo.

**Arreglo:** "SPHEREx DR1 HiPS (released 2026-11-01) · IRSA · NASA/SPHEREx, Caltech/IPAC · all-epoch coadd 2025-04-24–2026-05-14 · visualization only".

### m2 — MENOR: "Band" choca con la nomenclatura de SPHEREx

En `app.tsx:30` y en el `aria-label` (`app.tsx:26`), "Band 0…101" es el índice del plano. En SPHEREx, "band" significa el detector 1–6 (`properties`: "one per band (1-6) and channel (1-17)"). **Arreglo:** usar "Plane" o "Channel" y mostrar `50 · D3 ch17 · 2.399 µm`, con `D = ⌊i/17⌋+1` y `ch = i%17+1`.

### m3 — MENOR: el centro negro de las estrellas saturadas se puede confundir con un cambio

En las Pléyades y en otras estrellas brillantes, el núcleo sale negro (por ejemplo, en el píxel de R Dra el PNG vale 0 justo en la posición de catálogo). Es un efecto del dato: saturación o NaN en el coadd, no del motor. Pero alguien sin formación lo puede tomar por un "hueco" o por un cambio. **Arreglo:** una nota en la capa Inspeccionar o en el glosario: "Black cores in bright stars = saturated/no valid data, not a change" (nivel Observado del semáforo).

### m4 — MENOR: λ copiadas a mano y sin test

`frontend/src/engine/core/wavelengths.ts:1` coincide exactamente con `properties` (102/102, comprobado). Pero ningún test lo compara con `docs/fuentes/spherex-dr1-hips-properties.txt`. **Arreglo:** un test que lea el archivo de `properties`, compare el arreglo y verifique la longitud 102 y los planos vacíos 50/51.

### m5 — MENOR: el script de fixtures no fija sus dependencias

`scripts/generate-sky-engine-fixtures.py:1-5` no tiene metadatos PEP 723 ni `.lock`. `generate-spherex-grid.py` sí los tiene. Hoy reproduce bit a bit con astropy 8.0.2 / astropy-healpix 1.1.3 / numpy 2.5.4. **Arreglo:** agregar el bloque `# /// script` con esas versiones y un `.lock`. Además, el script usa rutas relativas al directorio de trabajo; conviene `Path(__file__).resolve().parents[1]`.

### Informativo

- **i1.** `ang2pix` en vértices exactos: (0°, 0°) en orden 2 da 70 (astropy: 76); (180°, 0°) en orden 3 da 410 (astropy: 432). Son empates en un vértice, donde cada implementación decide distinto; el motor sigue la fórmula de HEALPix C. No tiene efecto práctico.
- **i2.** El shader recalcula HEALPix de orden 14 en float32 y no tiene test directo. Queda validado de punta a punta por el clic (errores 1,9–8,1″) y por el desvío de teselas ≤ 0,07 px.
- **i3.** El "píxel más brillante" no sirve para medir el clic en estrellas saturadas (Atlas: 43″, por el núcleo negro). Para la prueba de aceptación de la ficha conviene usar el centroide sobre estrellas no saturadas (G 8–9), como hice aquí.

## Detalle de las pruebas de clic (punto 3)

Vista `fov=0.15`, `proj=TAN`, `plane=0`, ventana de 1000×800 px y DPR 1. El clic se hace en el centroide, sin fondo, dentro de ±60 px de pantalla. Estrellas aisladas: G entre 8 y 9, sin otra estrella con G < 13 a menos de 90″.

| Campo | Gaia DR3 | RA, Dec (catálogo) | Clic devuelto | Error |
| --- | --- | --- | --- | --- |
| RW Aur | 156249505776562560 | 76,553767, +29,764784 | 76,55448, +29,76442 | 2,58″ |
| R Dra | 1648426010327729664 | 248,749714, +67,386223 | 248,74968, +67,38846 | 8,05″ |
| Pléyades | 65222209423382912 | 56,359028, +24,034944 | 56,35914, +24,03545 | 1,86″ |

En las tres vistas, el centro mostrado coincide con `ra`/`dec` de la URL con un error de 0,013–0,017″.

## Lo que está bien

- HEALPix NESTED correcto y probado contra fuentes independientes, con fixtures no circulares y reproducibles.
- Proyecciones exactas en magnitud.
- Orientación de la tesela verificada con 282 estrellas Gaia.
- Clic dentro de 1 píxel HiPS.
- λ por plano exactas.
- No hay valores físicos sacados de PNG ni afirmaciones de descubrimiento.
- "visualization only" y "uncertainty unavailable" visibles.

## Condición para APROBADO

Corregir B1 (con un test no circular de orientación contra `astropy.wcs`), M1 y M2, y mostrar la salida de `pnpm test`/`lint`/`build` más una captura de las Pléyades con Atlas y Pleione a la izquierda.
