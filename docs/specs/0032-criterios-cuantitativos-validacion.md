# Criterios cuantitativos para comparar observaciones

- Responsable humano: Sebastián. Estado: **propuesta operativa y evidencia**, 14-11-2026; no certifica ningún par. El usuario solicitó funciones y vista local; los umbrales mantienen el alcance y las limitaciones aquí descritos.
- Alcance: posición aparente y brillo, para las cinco regiones del reto. Los criterios de posición y los de brillo se aplican por separado.
- Fuentes internas: [ficha científica 0030](0030-validacion-interpretacion-cientifica.md), [controles WISE 0855 0031](0031-controles-wise-0855.md), propuesta de `Observation` de Johann y ficha de Mateo `0010-analysis-result.md`. La actualización de Mateo fue integrada en `origin/main` (`a5f892b`) durante esta sesión; se consultó directamente sin fusionar ni alterar los cambios locales en `scientific-rules`.
- Etiquetas: **[IRSA]** dato o práctica documentada en NASA/IPAC; **[MATEO]** sondeo o umbral provisional comunicado en su rama, no reproducido aquí; **[CÁLCULO]** aritmética o estadística con supuestos explícitos; **[PROPUESTA]** regla de trabajo no validada; **[PENDIENTE]** evidencia o decisión no disponible.

## 1. Qué significa que dos imágenes sean comparables

Una comparación válida es siempre **para una región o fuente, una zona y un método determinados**. Debe distinguirse entre (1) encontrar dos archivos candidatos, (2) tener evidencia suficiente para aplicar un método y (3) medir una diferencia que supera el error. Superar un número aislado no implica superar las tres etapas.

Resultado propuesto: `pending` si falta evidencia, `rejected` si hay incompatibilidad comprobada para el método, o `eligible_for_method` si todos los controles aplicables están justificados. Mantener un motivo, dato medido, unidades, método, fuente y versión por control. **No se asigna automáticamente el nivel confirmado.** Los nombres definitivos y la interoperabilidad con `AnalysisResult` corresponden a las fichas de sus responsables.

## 2. Umbrales existentes y alcance

| Control y cifra | Procedencia y uso permitido | Lo que no demuestra |
| --- | --- | --- |
| Dos adquisiciones distintas y fechas reales verificables | [PROPUESTA] Condición mínima para comparar momentos: identificadores de adquisición y tiempos de cabecera, con escala. Dos detectores o dos versiones de una adquisición no crean dos épocas. | Que la fuente exista o pueda medirse. |
| Valores de varianza finitos y positivos en píxeles usados | [PROPUESTA] Necesarios para un método de ajuste que use `VARIANCE`; registrar unidades y máscaras. | Que toda la incertidumbre esté incluida ni que la calidad de la fuente sea suficiente. |
| Fuentes de referencia con S/N > 10 y restricciones de saturación/vecindad | [IRSA] El suplemento §3.2.8 usa criterios específicos para **seleccionar referencias de calibración astrométrica**. Adaptarlos requiere comprobar bandas, aplicación y campo. | No es un umbral universal para el objeto, ni valida por sí solo el registro entre imágenes. |
| SNR ≥ 5 por exposición de la fuente | [MATEO] R11, criterio operativo provisional de su rama; descartar una medición por debajo conserva una no detección o límite cuando corresponda. [IRSA] AllWISE utiliza SNR ≥ 5 en al menos una banda para su catálogo, no como norma de SPHEREx. | No es una garantía de identidad, señal no contaminada ni comparabilidad. Verificar cómo se calcula SNR y su calibración con señales reales o inyectadas; no presentar como límite oficial SPHEREx. |
| `|CWAVE_A − CWAVE_B| / min(CBAND_A, CBAND_B) ≤ 0,02` | [MATEO] R6 propone esta **preselección específica del control de brillo de ε Indi B**; `CWAVE`/`CBAND` se leen en la posición correspondiente de cada observación y requieren calibración asociada. [PENDIENTE] Evidencia suficiente para demostrar sesgo espectral tolerable. | No es una tolerancia publicada por NASA ni válida automáticamente para WISE 0855, las otras regiones o movimiento. Pasar este filtro no garantiza respuesta espectral equivalente; fallarlo impide usar ese filtro provisional de brillo. |
| RMS astrométrico < 0,3″ | [IRSA] Suplemento §4.2.2 reporta rendimiento bajo condiciones y muestra concretas. [MATEO] considera 0,3″ provisional para explorar incertidumbre. | No es precisión garantizada de cada fuente, ni umbral universal de alineación, ni autoriza ignorar correlaciones o residual local. Medir error y sesgo en el campo real. |
| Término del 3 % del flujo | [IRSA] Suplemento §3.3, nota 1: dispersión adicional en incertidumbres de fotometría **del catálogo/método descrito**, derivada de mediciones repetidas. `VARIANCE` de imagen no cambia. | No es un umbral de compatibilidad, ni debe sumarse automáticamente a otras mediciones, dos veces o sin tratar correlaciones. La ecuación impresa parece dimensionalmente inconsistente; esta ficha se apoya en la descripción textual. |
| Cambio ≥ 5σ | [MATEO] R12 propone un criterio conservador para **afirmar un cambio medido**, no para decidir si las imágenes son compatibles. Su significado requiere modelo de errores válido y control de búsquedas múltiples. | No corrige por sí solo errores sistemáticos, mezcla de fuentes, selección sesgada ni falsas alarmas reales. Un resultado inferior no prueba ausencia de cambio. |

Los tres números de R6/R11/R12 aparecen atribuidos a una comunicación de Sebastián por la ficha 0010 de otra rama. Esa comunicación no está disponible en esta conversación: se conserva la atribución como **reporte de esa ficha**, sin hacerla pasar por verificación propia ni aprobación nueva. Son valores disponibles para ensayar, sujetos a los límites de arriba.

## 3. Cómo evaluar una comparación de manera medible

### 3.1 Controles comunes

1. Obtener los productos nativos, tiempos UTC o escala documentada, WCS, `FLAGS`, `VARIANCE`, calibraciones y transformaciones. El recorte debe conservar el vínculo a los píxeles nativos y al archivo original.
2. Identificar la fuente en cada fecha, o dejar constancia de no detección; para objetos rápidos, calcular posición y error esperados con época, movimiento y paralaje, sin sustituir la medición por la predicción. Cobertura de la región no es detección.
3. Verificar calidad sobre los píxeles utilizados, teniendo en cuenta la operación: IRSA define listas distintas para ajuste y fondo. `SOURCE` no es automáticamente una mala señal. `L2DQA=Pass` o `FINAST=0` se conservan como procedencia, no certifican el par.
4. Medir la alineación con referencias independientes del objetivo y registrar residuos en dos coordenadas, tamaño y distribución de la muestra, incertidumbre y método. Evaluar PSF, vecinos y sensibilidad a la posición dentro del píxel. [PENDIENTE] Fijar un error máximo permitido por método y verificarlo con controles o inyecciones; un RMS general de misión no lo sustituye.
5. Comprobar escala de flujo y fondo; conservar mediciones científicas antes del estiramiento de pantalla. Propagar incertidumbre de medición y registro, además de términos sistemáticos y sus correlaciones. Un valor aparente compatible con cero no demuestra que el sesgo sea pequeño.

### 3.2 Espectro y brillo

Para cada medición: posición o área en detector nativo → `CWAVE` y `CBAND` del producto asociado → diferencia normalizada. `WCS-WAVE` es aproximado para visualización; `em_min/em_max` cubre todo el detector [S1]. Comparar centros y anchos es un filtro, no prueba completa de equivalencia: la respuesta de cada banda y el espectro/mezcla de la fuente también influyen [S2].

Para que el par llegue a `eligible_for_method` en brillo se requiere evidencia de que el sesgo fotométrico inducido por la diferencia de respuesta es menor que un margen de error definido **para ese objetivo y método**, incluida su incertidumbre; puede estimarse con respuesta/espectro apropiados o controles empíricos. [PENDIENTE] El margen, el modelo de respuesta y la validación no están fijados en las fuentes disponibles. Si faltan, el resultado es `pending`, aunque pase 0,02. No inferir variabilidad mediante diferencias de color de pantalla.

### 3.3 Posición y significancia

Medir la fuente en cada imagen con método e incertidumbre y registrar la diferencia en RA·cos(Dec) y Dec. Si `C_A`, `C_B` y `C_AB` son las covarianzas de posición y su correlación entre imágenes, `C_Δ = C_A + C_B − C_AB − C_ABᵀ`. Si no se conocen las correlaciones, no suponer independencia como hecho: documentar aproximación y su efecto.

**[CÁLCULO]** Para una diferencia bidimensional con errores gaussianos, covarianza estimada correctamente y una hipótesis nula definida, `Q = Δᵀ C_Δ⁻¹ Δ` sigue χ² con 2 grados de libertad. Si se aplica la política provisional de Mateo de 5σ **bilateral** como probabilidad gaussiana 1D equivalente: `p = erfc(5/√2) ≈ 5,7330 × 10⁻⁷` y `Q ≥ −2 ln(p) ≈ 28,7437`. No sustituirlo por `Q ≥ 25` ni por `separación/σ ≥ 5` sin demostrar condiciones equivalentes. Para flujo escalar gaussiano, el estadístico es `|F_B − F_A| / σ_ΔF`; `σ_ΔF` debe incluir covarianza y sistemáticos relevantes.

Estos números clasifican **una diferencia medida**, no la compatibilidad previa. El resultado nominal para una sola prueba no es probabilidad global cuando se buscan muchas fuentes, fechas o bandas; registrar la búsqueda y calibrar la tasa de falsos positivos. Para ε Indi B debe considerarse que Ba/Bb pueden no resolverse y que su centro de luz puede depender de λ; para WISE 0855, incertidumbre de posición y paralaje pueden afectar la asociación.

## 4. Aplicación a datos actuales

| Caso | Cálculo / evidencia | Estado |
| --- | --- | --- |
| WISE 0855 D3, may-2025/may-2026 | [0031] archivos, fechas y recortes reales; con posiciones **hipotéticas**, `CWAVE` 2,36283445 / 2,36280298 µm y `CBAND` 0,05832746 / 0,05802399 µm. [CÁLCULO] Δλ/min(CBAND) ≈ 0,000542. | `pending`: identidad y posición no confirmadas, detección, calidad de apertura, registro, PSF e incertidumbre no evaluados. No aplicar 0,02 de ε Indi B como aprobación de WISE. |
| ε Indi B, control de brillo | [MATEO] ficha 0010 anexo B.3 informa 1,9341 / 1,9333 µm y anchos 0,0469 / 0,0476 µm. Una exploración independiente de este encargo (§4.1) recuperó 1,934120774 / 1,933309913 µm, con anchos 0,046931170 / 0,047647767 µm; [CÁLCULO] razón ≈ 0,017278 y cumple el filtro provisional 0,02. | Dos recortes reales inspeccionados; falta verificar identificación, asociación de calibración, ajuste, registro, PSF y sesgo espectral. Pasar el filtro no demuestra equivalencia ni ausencia de variación. |
| ε Indi B, movimiento | [MATEO] anexo B.2 reporta mediciones exploratorias; su propia ficha deja controles C1–C7 pendientes, incluidos FLAGS, registro, paralaje y mezcla Ba/Bb. | Candidato; no caso evaluado ni resultado reproducido por esta sesión. |

### 4.1 Comprobación independiente de los recortes de ε Indi B

Se recuperaron del archivo NASA/IPAC dos exposiciones D3: [A, 2025-06-10 04:34:17.284 UTC, DR1](https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2025W24_1A/l2b-v27-2026-201/3/level2_2025W24_1A_0245_4D3_spx_l2b-v27-2026-201.fits) y [B, 2026-09-28 08:05:41.877 UTC, QR3](https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W40_1A/l2b-v27-2026-276/3/level2_2026W40_1A_0070_2D3_spx_l2b-v27-2026-276.fits). Para repetir el recorte se añadió a cada URL `?center=331.095,-56.801&size=0.04`; la posición inicial se aproximó con una posición de 2MASS y el movimiento de ε Indi A, **sin modelar paralaje**. No equivale a confirmar la posición de Ba/Bb.

Se inspeccionaron FITS y WCS nativos con Astropy y se ajustó una gaussiana elíptica más fondo constante, ventana 7×7 y pesos de `VARIANCE`, sin excluir `FLAGS` durante el ajuste. La unión de `FLAGS` dentro de 2,5 píxeles del centroide ajustado es `2097152` (`SOURCE`) en ambas. Lectura por píxel nativo más próximo de `CWAVE`/`CBAND` del archivo D3 `cal-swcs-v5-2026-191`, siguiendo el método de la ficha 0001. El ajuste exploratorio entrega χ² reducido ≈ 2,47 y 4,25; no se ha validado el modelo, el tratamiento de errores ni el vínculo de calibración de estas imágenes particulares. La inspección se repitió usando Astropy 8.0.2 y SciPy 1.18.0, con iguales cifras redondeadas del sondeo. **No es una medición aceptada de posición, brillo, SNR ni detección.**

**Aclaración reproducida:** los píxeles nativos enteros `(x, y)`, origen 0, fueron `(793, 1146)` para A y `(195, 1184)` para B. Son los más próximos al centroide exploratorio, no al centro del recorte de Johann. El contraste con el paquete y la versión de calibración está en [0037](0037-respuesta-paquete-epsilon-indi-b.md).

Contraste de fallo real: otra exposición QR3 del mismo apuntamiento (`2026W40_1A_0070_1D3`) presenta `TRANSIENT`, `SUR_ERROR` y `NONFUNC` en la zona examinada, por lo que no se debe tratar igual que la exposición `_2D3`; la consecuencia exacta depende de máscara y método. Las imágenes y el cálculo siguen siendo exploratorios. No se afirma que la calibración sea universalmente válida ni que Ba/Bb estén separados.

**Registro preliminar del campo:** en recortes más amplios (`size=0.12°`) del mismo par se emparejaron automáticamente máximos de brillo y se ajustaron centroides gaussianos. En ocho asociaciones que tenían únicamente el bit `SOURCE` en ambas imágenes, el desplazamiento mediano fue (−0,1875″, −0,3195″) y el RMS vectorial alrededor de esa mediana ≈ 0,700″. La prueba se repitió con Astropy 8.0.2 y SciPy 1.18.0. **No es un error de registro validado:** no se confirmó la asociación con un catálogo ni el movimiento de las referencias, el modelo no enmascaró FLAGS durante los ajustes y algunos ajustes tienen χ² elevado. La selección exploratoria de máximos se basó en el percentil 98 de brillo y una búsqueda local; estas son opciones del sondeo, no umbrales científicos. Sirve para demostrar que no debe sustituirse un control local por el valor general de 0,3″ de la misión.

**Contraste exploratorio con Gaia:** una consulta [Gaia DR3 en NASA/IPAC](https://irsa.ipac.caltech.edu/cgi-bin/Gator/nph-query?spatial=cone&catalog=gaia_dr3_source&objstr=331.0958+-56.8004&radius=240&radunits=arcsec&outfmt=1&selcols=source_id,ra,dec,pmra,pmdec,parallax,phot_g_mean_mag,ruwe) devolvió 114 filas, 100 con movimiento propio disponible. Para las ocho referencias anteriores se buscó la coincidencia más cercana a la fecha A y se corrigió el desplazamiento A→B con el movimiento propio Gaia. Sus coincidencias más cercanas quedaron entre 0,142″ y 0,588″; el desplazamiento mediano corregido fue (−0,194″, −0,316″) y el RMS vectorial ≈ 0,705″. El cálculo propagó movimiento lineal sin distancia ni velocidad radial: Astropy advirtió que sustituyó distancias, y no se aplicó paralaje. Las coordenadas de centroides usados estaban redondeadas a 6 decimales de grado. Es una comprobación adicional, **no una asociación definitiva ni un registro aprobado**: faltan incertidumbres individuales y de catálogo, control de mezclas y selección, inspección de calidad del ajuste y del efecto de color y paralaje. Los resultados dependen de la muestra y tampoco convierten 0,705″ en umbral.

**Sensibilidad al método de brillo:** sobre los mismos dos recortes, un sondeo con apertura de radio 2 píxeles y fondo mediano en anillo de 3–5 píxeles, sin máscara de vecinos ni corrección de apertura, dio 12 340,79 ± 121,15 µJy y 12 256,68 ± 120,01 µJy; las incertidumbres incluyen únicamente la varianza de los píxeles de apertura. Los valores difieren del sondeo de la ficha de Mateo y tienen signo opuesto en la diferencia; los detalles de ambos métodos aún no permiten atribuir la discrepancia a una sola causa. Esto **no mide variación** ni demuestra que el filtro espectral sea suficiente: hay que reproducir métodos, máscaras, fondo, PSF y errores antes de comparar.

## 5. Pruebas necesarias para que los umbrales sean confiables

- **Registros reales:** guardar archivos, revisiones, fechas, calibraciones y código; reproducir los sondeos sin apoyarse en rutas temporales. Repetir con varias exposiciones de cada época y no solo un par.
- **Controles de campo:** fuentes de referencia no saturadas y bien identificadas, medidas ciegas y distribuciones de residuos por posición, detector y longitud de onda. Seleccionar referencias y evaluar residuos son operaciones distintas.
- **Inyección y recuperación sintética rotulada:** probar desplazamientos y flujos conocidos sobre fondos reales, distintas posiciones dentro del píxel, PSF, vecinos y `FLAGS`; medir sesgo, cobertura de incertidumbres, sensibilidad y falsos positivos. No presentar señales inyectadas como resultados astronómicos.
- **Espectral:** usar respuestas y, si se conoce, espectro de la fuente o controles apropiados; cuantificar sesgo versus λ y comprobar que queda bajo el margen permitido. Una sola pareja no valida el umbral 0,02.
- **Independencia:** no usar el mismo catálogo que calibró la WCS como única confirmación independiente; conservar la procedencia del contraste. Para movimiento cercano, considerar paralaje y observador.
- **Incompatibles y ausentes:** probar misma adquisición, tiempos sin escala, λ solo aproximada, saturación, varianza inválida, cobertura insuficiente, no detección y parámetros ausentes. Deben producir motivo explícito, no un pase por defecto.

## 6. Fuentes oficiales

- [S1] [SPHEREx Explanatory Supplement](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf): §§3.2.8, 3.3, 4.2.2 y 4.3.1; `CWAVE`, `CBAND`, calibración, FLAGS e incertidumbres.
- [S2] [NASA/IPAC: calibraciones y curvas espectrales](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/spherex_spectral_calibrations.html): las curvas publicadas son representativas por canal; no asumir respuesta individual exacta para todos los píxeles.
- [NASA/IPAC: espectrofotometría y máscaras](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html).
- [NASA/IPAC: catálogo AllWISE y selección SNR](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec2_2.html): ejemplo de criterio de otro catálogo, no norma de SPHEREx.
