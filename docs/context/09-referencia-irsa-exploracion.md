# 09 · Explorar todo el cielo: referencia IRSA y análisis para agentes

Estado: investigación y dirección solicitada por Dax, 14-nov-2026. Las decisiones de producto y las fichas de implementación siguen sujetas a revisión del equipo. La demo de WISE 0855 es un experimento, **no delimita el producto**.

## Qué muestran las capturas

Las tres capturas de Dax muestran el SPHEREx Data Explorer: un **mapa global del cielo**, después acercamiento progresivo hasta una zona y selección de una región circular. En la barra aparece un plano de longitud de onda (0,771 µm, 2/102). Las fuentes visibles son mediciones de muchas zonas; no son 102 momentos distintos ni una visualización directa de distancias 3D. La selección permite buscar datos de la zona en el archivo.

Es una vista panorámica diferente del recorte experimental de 29×29 píxeles centrado en WISE 0855. WISE es un objeto/caso de prueba; su aspecto pequeño o puntual no significa que el archivo contenga un solo píxel o una sola imagen. No se identificó cuál punto de la demo es WISE y no debe marcarse como tal sin validación.

## Dos capas de datos que no hay que confundir

| Capa | Qué aporta | Qué no demuestra |
| --- | --- | --- |
| Mapa global **HiPS** de SPHEREx DR1 | Cielo navegable de resolución progresiva, con 102 planos espectrales y selección de regiones. El cubo combina imágenes de DR1. | No es una secuencia temporal por sí mismo. Las teselas PNG son para visualización, no para medición científica. |
| Imágenes espectrales **FITS** individuales | Observaciones con fecha, WCS, datos y metadatos; permiten buscar imágenes que cubren la región elegida. | Varias imágenes no implican épocas independientes ni que sean comparables: verificar longitud de onda local, alineación y calidad. |

El suplemento oficial indica que se usaron **más de 1,2 millones de imágenes individuales DR1** para construir los cubos; no extrapolar ese número al número de épocas o a cada región. [Suplemento oficial §2.5](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf).

## Objetivo de experiencia expresado por Dax

- Explorar el cielo completo, moverse y acercarse, elegir múltiples regiones, buscar por nombre o RA/Dec y usar WISE y otros casos como ejemplos.
- Una experiencia inmersiva e interactiva, potencialmente con esfera celeste 3D, que ayude a entender dónde se está mirando y cómo cambia una zona en el tiempo.
- Obtener observaciones reales de IRSA, guardar datos solicitados en caché y mostrar siempre origen, fecha y limitaciones. Los backends independientes no comparten automáticamente sus archivos.
- Distinguir esfera celeste (proyección de imágenes sobre una superficie de navegación) de representación física 3D: no inventar distancia ni relieve de objetos a partir de una imagen 2D. Cualquier profundidad física requiere datos de distancia y su incertidumbre.

## Encargo de investigación para futuros agentes (no es autorización de implementación)

1. **Recorrer IRSA:** mapa global, arrastre/zoom, selección circular, búsqueda por nombre y coordenadas, filtros temporales y espectrales, resultados, FITS, cobertura, metadatos, contraste, colores y manejo de errores. Registrar fecha, acciones, resultados, capturas, rendimiento y bloqueos. Priorizar pruebas reales; si falla TAP/SIA, consignar el error y no inventar resultados.
2. **Trazar las piezas públicas:** revisar documentación de [HiPS de IRSA](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html), [SIA2 y datos](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/), [Firefly de Caltech/IPAC](https://github.com/Caltech-IPAC/firefly) y [API de Aladin Lite](https://aladin.cds.unistra.fr/AladinLite/doc/). Comparar reutilización con construir un visor, sus capacidades, costos, licencias y límites. Verificar compatibilidad real de los 102 planos HiPS con cada opción antes de prometerla. Respetar licencias, atribución y políticas de uso; no copiar marcas ni logos de NASA.
3. **Separar funciones:** mapa acumulado y sus teselas; selección de RA/Dec y campo angular; consulta de observaciones; selección de épocas y λ; reproyección y controles; visualización; caché. Documentar entradas, salidas, unidades y fallos. No inferir arquitectura interna no observada.
4. **Comparar opciones de interacción:** proyección plana y esfera celeste interactiva; evaluar legibilidad, teclado/táctil, orientación, móvil, rendimiento, mareo y alternativa accesible. No confundir atractivo visual con profundidad científica.
5. **Investigar la comparación:** casos del reto y regiones libres; misma región, fecha, λ local mediante WCS-WAVE, WCS espacial, FLAGS, incertidumbre y procedencia. Etiquetar las diferencias como aparentes hasta que pasen controles. No exigir ni prometer cambios donde no se han verificado.
6. **Caché:** documentar jerarquía local/IRSA, límites, caducidad, integridad, trabajo concurrente y opciones de compartir datos entre computadoras; diferenciar caché del navegador, del backend y almacenamiento compartido. Ver `docs/specs/0001-exploracion-cache-borrador.md`.
7. **Entregar al equipo:** matriz de funciones de IRSA (observado/documentado/no verificado), opciones de mejora con ventajas y límites, capturas y fuentes, riesgos científicos y una propuesta de ficha para cada módulo. Humanos eligen y aprueban; no asumir que esta guía aprueba implementación.

## Fuentes

- [Búsqueda en IRSA](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/searching.html).
- [Resultados y observaciones](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/results.html).
- [Suplemento SPHEREx §2.5](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf).
- [Código abierto Firefly](https://github.com/Caltech-IPAC/firefly).
- [Documentación Aladin Lite](https://aladin.cds.unistra.fr/AladinLite/doc/).

## Avance local: índice de celdas HiPS

El 14-nov-2026 se creó fuera del repo `~/Desktop/skyshift-demo/grid-hips/indice-celdas.csv`: 12.288 celdas HEALPix anidadas, orden 5, con centro RA/Dec y URL calculada al cubo FITS de esa celda. El archivo `properties` y `manifiesto.json` conservan la fuente y los 102 valores espectrales. El script `generar-indice.py` calculó la celda 445 del ejemplo del [tutorial oficial de IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/) y la celda 10226 para RA 133,7951°, Dec −7,2451° (WISE 0855).

**Alcance:** es una cuadrícula geométrica del mapa agregado, no una lista procesada de las más de 1,2 millones de imágenes, ni un inventario temporal. Cada fila registra solo el centro; la celda cubre un área y puede cruzar límites de RA. Las URLs se derivan del patrón oficial y no acreditan que se haya descargado o comprobado cada archivo. Los FITS de cubo son grandes y el tutorial advierte que pueden rondar 300 MB: descargarlos bajo demanda y con límites de caché. El HiPS de 102 canales es para navegación espectral; buscar imágenes individuales vía SIA2 para cambios en el tiempo.
