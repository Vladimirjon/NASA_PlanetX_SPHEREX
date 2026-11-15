# Controles iniciales — WISE 0855, par candidato DR1 D3

**Estado: preselección en curso; no evaluado.** Objetivo: buscar una posible diferencia de posición en WISE 0855. Este registro reúne evidencia real y pendientes; no afirma que la fuente esté detectada ni que se haya movido en estas imágenes. Fecha de consulta: 14-11-2026. Referencia de criterios: [ficha 0030](0030-validacion-interpretacion-cientifica.md).

## Productos candidatos

La consulta [SIA2 de IRSA](https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_dr1&POS=circle+133.7951+-7.2451+0.01) devolvió HTTP 200, `QUERY_STATUS=OK` y 258 filas. De ellas se seleccionaron las dos filas D3 identificadas previamente en [ficha 0001 §7.4](0001-arquitectura-observation.md). Consultamos las cabeceras `IMAGE` de los dos originales mediante lecturas parciales de S3; cada respuesta fue HTTP 206. No se descargaron ni analizaron los píxeles en esta sesión.

| Dato | Imagen A | Imagen B |
| --- | --- | --- |
| Identificador de adquisición (`OBSID`) | `2025W19_1B_0116_1` | `2026W20_1A_0033_1` |
| Colección / detector | `spherex_dr1` / D3 | `spherex_dr1` / D3 |
| Fecha media de adquisición (`DATE-AVG`, `TIMESYS=UTC`) | 2025-05-05 16:49:00.018 UTC | 2026-05-11 02:19:42.221 UTC |
| Versión del producto en el nombre | `l2b-v27-2026-197` | `l2b-v27-2026-246` |
| Archivo oficial | [A en IRSA](https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2025W19_1B/l2b-v27-2026-197/3/level2_2025W19_1B_0116_1D3_spx_l2b-v27-2026-197.fits) | [B en IRSA](https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2026W20_1A/l2b-v27-2026-246/3/level2_2026W20_1A_0033_1D3_spx_l2b-v27-2026-246.fits) |

Las fechas de procesamiento contenidas en los nombres de archivo no son las fechas de adquisición.

## Lista de controles

`pass` = evidencia concreta para ese control; `unknown` = falta evidencia; `fail` = incompatibilidad demostrada; `warning` = evidencia que requiere atención. Un `pass` individual no aprueba el par completo.

| Control | Estado | Evidencia disponible / siguiente dato |
| --- | --- | --- |
| Archivos identificados | `pass` | SIA2 devuelve las dos URLs originales y los identificadores D3; cabeceras confirman `OBSID` y detector 3. |
| Adquisiciones y fechas distintas | `pass` | `OBSID` distintos y `DATE-AVG` UTC distintos, leídos de ambas cabeceras. No son dos versiones de una misma adquisición. |
| Cobertura del punto consultado | `pass` limitado | SIA2 devuelve ambos productos para el círculo centrado en RA 133,7951°, Dec −7,2451°. La ficha 0001 §7.4 informa que el punto cae en el detector; esto no comprueba la cobertura útil de la posición real del objeto por fecha. |
| Detección y posición de WISE 0855 | `unknown` | No se han inspeccionado píxeles ni propagado la posición del objeto a ambas fechas. No confundir cobertura con detección. |
| Calibración espectral y λ local | `unknown` | La ficha 0001 §7.4 informa `CWAVE` ≈ 2,3642 µm para ambas exposiciones **en un mismo punto fijo**. Falta localizar la fuente por época, recuperar `CWAVE`/`CBAND` en esas posiciones y documentar asociación de calibración, píxel y tratamiento de la zona de medida. No hay tolerancia adoptada. |
| Alineación y cobertura válida | `unknown` | No se han producido recortes alineados ni calculado residuos con fuentes de referencia. La cobertura útil en la zona y la incertidumbre del registro no están medidas. |
| FLAGS en la fuente | `unknown` | No se han leído los valores de `FLAGS` en los píxeles relevantes de ninguna imagen. Un bit informativo no equivale por sí solo a fallo. |
| Varianza, fondo y PSF | `unknown` | No se han inspeccionado `VARIANCE`, fondo, saturación, fuentes vecinas ni EPSF locales. Aún no existe incertidumbre de posición o brillo. |
| Indicadores de pipeline | `pass` limitado | Ambas cabeceras indican `L2DQAFLG=Pass` y `FINAST=0`. Son indicadores de procesamiento y **no** prueban que el par sea comparable ni que la fuente esté presente. |
| Transformaciones y mediciones | `unknown` | No hay recortes, reproyección ni mediciones ejecutadas en esta sesión. |

## Resultado y siguiente operación

**Resultado:** `pending` en preselección. La evidencia existente permite trabajar con dos exposiciones identificadas y separadas en el tiempo. Todavía no permite marcar el par como apto para medir ni como cambio observado o evaluado.

**Siguiente operación concreta:** obtener para ambos originales recortes que conserven `IMAGE`, `FLAGS`, `VARIANCE`, WCS y la relación con píxeles nativos; recuperar la posición esperada de WISE 0855 en cada fecha con fuente y época trazables; inspeccionar si la fuente es detectable y asociar `CWAVE`/`CBAND` al píxel correspondiente. Después, verificar alineación y calidad antes de interpretar cualquier diferencia. No se han asignado umbrales numéricos ni se han modificado contratos compartidos.

## Exploración posterior del 14-11-2026

**Resultado actualizado: `pending`.** Los datos siguientes son exploratorios: no se ha confirmado la identidad de la fuente ni la posición aparente precisa, ni se ha realizado fotometría o astrometría de WISE 0855.

1. **Posición candidata, no confirmada.** Una [consulta al catálogo CatWISE2020 de NASA/IPAC](https://irsa.ipac.caltech.edu/cgi-bin/Gator/nph-query?spatial=cone&catalog=catwise_2020&objstr=133.7836+-7.2445&radius=40&radunits=arcsec&outfmt=1&selcols=source_name%2Cra%2Cdec%2Cra_pm%2Cdec_pm%2CPMRA%2CPMDec%2CsigPMRA%2CsigPMDec%2Cw2mpro_pm) devolvió varias soluciones con movimiento parecido; su documentación advierte que la fuente aparece varias veces en el catálogo ([CatWISE2020, §3.3.3](https://irsa.ipac.caltech.edu/data/WISE/CatWISE/gator_docs/Marocco_CatWISE2020.pdf)). Se eligió para exploración la fila `J085507.96-071439.3`, con `ra_pm=133.7839240°`, `dec_pm=−7.2443404°`, `PMRA=−8.02120` y `PMDec=+1.03570` arcsec/año; el [diccionario CatWISE](https://irsa.ipac.caltech.edu/data/WISE/CatWISE/gator_docs/catwise_colDescriptions.html) sitúa `ra_pm`/`dec_pm` en MJD 57170. Se extrapoló linealmente sin paralaje hasta A `(133.761598°, −7.241481°)` y B `(133.759320°, −7.241189°)`, suponiendo `PMRA=μα cos(dec)` y año de 365,25 días. [VERIFICAR] equivalencia exacta de la convención del campo y asociación individual. Estas coordenadas no son una identificación ni una efeméride validada.
2. **Recortes obtenidos.** IRSA devolvió recortes centrados en esas posiciones exploratorias, `size=0.02°`, cada uno con `IMAGE`, `FLAGS`, `VARIANCE`, `ZODI`, `EPSF` y `WCS-WAVE`; `IMAGE`, `FLAGS` y `VARIANCE` son de 12 × 12 píxeles. [Recorte A exploratorio](https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2025W19_1B/l2b-v27-2026-197/3/level2_2025W19_1B_0116_1D3_spx_l2b-v27-2026-197.fits?center=133.761598,-7.241481&size=0.02); [recorte B exploratorio](https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2026W20_1A/l2b-v27-2026-246/3/level2_2026W20_1A_0033_1D3_spx_l2b-v27-2026-246.fits?center=133.759320,-7.241189&size=0.02). En el bloque central de 3 × 3 píxeles, `FLAGS` contiene solo 0 o el bit `SOURCE`; existen otros bits en otras posiciones de ambos recortes. Los 144 valores de `VARIANCE` son finitos y positivos en cada recorte. Astropy 8.0.2 confirmó los valores y verificó la estructura FITS; la unidad de varianza es `MJy2 / sr2`. **Nada de esto demuestra que WISE esté en el centro ni que la apertura relevante esté libre de problemas.**
3. **Calibración y λ exploratorias.** El [Spectral WCS D3](https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/spectral_wcs/cal-swcs-v5-2026-191/3/spectral_wcs_D3_spx_cal-swcs-v5-2026-191.fits) se contrastó con ambos productos: comparten el UUID `spectral_wcs` en `HISTORY` y la tabla `WCS-WAVE` embebida coincide byte a byte con la del producto de calibración. Esto respalda la asociación descrita en la ficha 0001; no equivale a un mapeo oficial de UUID a archivo. Usando inversión TAN-SIP exploratoria y vecino más cercano, los píxeles originales base 0 son A `(362,158)` y B `(360,158)`: `CWAVE` 2.36283445 y 2.36280298 µm; `CBAND` 0.05832746 y 0.05802399 µm, respectivamente. La transformación de las coordenadas hipotéticas se contrastó con `astropy==8.0.2` y coincidió con el cálculo independiente a ~3 × 10⁻⁸ píxel. Son valores en **posiciones hipotéticas**, no en una fuente confirmada; falta incluir paralaje, definir el área de medida y el criterio espectral. La cercanía entre esos números no aprueba el par.
4. **Riesgo de detectabilidad.** NASA describe WISE 0855 como muy débil en infrarrojo cercano y señala emisión estudiada cerca de 5 µm ([NASA](https://science.nasa.gov/universe/exoplanets/astronomers-find-water-clouds-in-cold-jupiter-like-object/)). Es una razón para comprobar la señal a ~2,36 µm, no prueba de que sea indetectable en estas imágenes SPHEREx.

Los recortes originales centrados en el punto fijo de la búsqueda no se pueden tratar como recortes de la fuente: la posición exploratoria anterior está a más de 120 segundos de arco del centro fijo. Esa distancia depende de la asociación no confirmada; no usarla como trayectoria validada.

**Pendientes operativos:** identificar de forma inequívoca la fuente y su astrometría/época con incertidumbre y paralaje; propagarla a cada fecha y observador; verificar señal y cobertura útil; ejecutar controles locales de FLAGS y VARIANCE sobre la apertura que realmente se use; medir y propagar el error de alineación y de posición; resolver política espectral y tratamiento de PSF/fondo. Si falla la identificación o la señal, el par no sostiene una medición de movimiento.

### Comprobación adicional de ubicación en los recortes

Con `astropy==8.0.2` y la WCS de cada recorte se transformaron las coordenadas hipotéticas anteriores: A cae en `(x=5.8669, y=5.7855)` y B en `(x=5.2319, y=5.3072)`, píxeles con origen 0. Los píxeles más cercanos son respectivamente `(6,6)` y `(5,5)`; ambos tienen `FLAGS=2097152` (`SOURCE`). En esos píxeles se leyeron valores de `IMAGE` de 0.17424 y 0.30183 `MJy/sr`, respectivamente, y `VARIANCE` de 0.00025854 y 0.00037981 `(MJy/sr)²`. **Son lecturas de un píxel, no medidas del brillo de WISE 0855**: no se ha identificado la fuente, restado el fondo, ajustado la PSF ni estimado su posición. No se comparan esos valores como variación temporal.

Para comprobar manualmente: abrir [SPHEREx Data Explorer de NASA/IPAC](https://irsa.ipac.caltech.edu/applications/spherex), buscar las coordenadas y fechas de la tabla de productos y seleccionar colección DR1 y detector D3. Alternativamente descargar los [archivos originales](#productos-candidatos) o los dos [recortes exploratorios](#exploración-posterior-del-14-11-2026); son FITS científicos, no imágenes PNG. Usar las coordenadas hipotéticas de cada fecha como centro de búsqueda, sabiendo que no identifican aún el objeto.

## Datos necesarios para validar cualquier par

| Control | Qué debe existir | Si falta o falla |
| --- | --- | --- |
| Identidad y trazabilidad | Dos archivos y adquisiciones identificados, colección, detector, versión, fechas efectivas y referencias a originales/derivados. | Sin identidad o tiempo verificable: pendiente; misma adquisición usada como épocas distintas: rechazar esa comparación. |
| Objetivo y cobertura | Región y fuente identificadas; posición en cada fecha y marco, incertidumbre, paralaje cuando corresponda, huella útil y píxeles suficientes en ambas. | Sin identificación o señal medible no se atribuye un cambio al objeto. |
| Geometría | WCS completa, proyección a una rejilla común cuando corresponda, referencias independientes, residuos y error del registro; conservar máscaras y transformaciones. | Un desplazamiento global o registro no cuantificado impide interpretar movimiento de la fuente. |
| Espectro | `CWAVE` y `CBAND` vinculados a los productos, en posición/área de la fuente para cada fecha; respuesta espectral y criterio aplicable cuando haga falta. | `WCS-WAVE` o igualdad de detector no bastan. Sin criterio defendible la comparabilidad queda pendiente. |
| Calidad e instrumento | Bits `FLAGS` en los píxeles usados, cobertura, saturación, defectos, PSF/EPSF local, calibración, fondo y fuentes mezcladas. | Cada bit se interpreta según su significado y método; un resumen `Pass` no reemplaza la inspección. |
| Incertidumbres | `VARIANCE` y unidades, errores de posición o flujo y de fondo, PSF, registro, reproyección y sistemáticos/correlaciones relevantes. | Sin incertidumbre apropiada no se puede decidir si la diferencia persiste frente al error. |
| Método y resultado | Método definido para **posición** o **brillo**, unidades, orden de comparación, detecciones/no detecciones y límites. | Una representación de pantalla no es fotometría; una no detección no significa flujo cero. |
| Interpretación | Evidencia y límites ligados al par y al método. Diferencia persistente tras controles → evaluada; el software no asigna confirmado. | Si los controles no se completan, no elevar la interpretación a evaluada. |

Esta lista es un registro de necesidades científicas; no fija umbrales ni modifica el contrato de otros módulos. Para cualquier fecha, el rango `em_min/em_max` describe el detector completo y sirve para búsqueda, no para probar λ local.
