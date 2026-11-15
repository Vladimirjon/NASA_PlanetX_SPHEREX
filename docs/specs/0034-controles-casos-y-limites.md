# Controles para los cinco casos y plan de validación

Responsable: Sebastián · 14-nov-2026 · **En curso; ningún par está evaluado.**
Base: fichas 0030–0033, `science/checklists.py` y los datos de `science_preview/cases.json`. Los informes por método están en `science/real-checklists.json` y se regeneran con `python -m science.checklists`. Son registros internos, no contratos compartidos.

## Lista por método

Cada control entrega `pass` (aprobado), `fail` (rechazado) o `unknown` (faltan datos), un motivo y referencias cuando las aporta el responsable. `warning` se conserva como pendiente. Una referencia aportada no verifica por sí sola la evidencia: exige revisión. La identidad y el tiempo se calculan con los metadatos aportados; no se comprueba su autenticidad contra IRSA automáticamente. Preselección nunca habilita medir; un par preparado con todos los controles supera únicamente la puerta para **aplicar ese método**, no se convierte en resultado científico evaluado.

| Para ambos métodos | Qué debe demostrarse |
| --- | --- |
| Identidad y fecha | Archivos y adquisiciones distintos, fechas UTC válidas y trazables. |
| Objetivo y cobertura | Misma fuente o región, posición por época y píxeles útiles. |
| Alineación | Referencias del campo, transformación y residuos locales apropiados para la medición. |
| Calidad | FLAGS y saturación de los píxeles relevantes, fuentes vecinas y calidad de ajuste. |
| Incertidumbre | Varianza y errores de medición, calibración, alineación y correlaciones pertinentes. |
| Método | Procedimiento reproducible para la fuente, datos y transformaciones. |

**Movimiento:** además, comprobar si la longitud de onda y fuentes mezcladas pueden desplazar el centro aparente (`centroid_color_bias`); estimar movimiento esperado y paralaje cuando corresponda. Una diferencia significativa se estudia *después* de la comparabilidad.

**Brillo:** además, verificar calibración y compatibilidad espectral local, sesgo por respuesta fotométrica y fondo. El filtro de centros `CWAVE`/`CBAND` no demuestra equivalencia espectral.

## Cinco objetivos del reto

| Objetivo | Movimiento | Brillo |
| --- | --- | --- |
| ε Indi B | **Pendiente.** Par DR1/QR3: identidad y fecha documentadas; falta verificar fuente, cobertura útil, alineación, calidad y errores. Ba/Bb pueden estar mezcladas. | **Pendiente.** La razón espectral pasa el filtro provisional 0,02 para este par, pero no demuestra compatibilidad ni cambio. |
| WISE 0855 | **Pendiente.** Par DR1: identidad y fecha documentadas; la posición utilizada era hipotética y la detección no está confirmada. | **Pendiente.** No hay evidencia suficiente de detección, calibración en la fuente ni fotometría compatible. |
| Estrella de Barnard | **Pendiente.** No hay par auditado en esta ficha; verificar saturación, identificación y medición. | **Pendiente.** Verificar saturación, datos y método; no se declara medible. |
| RW Aurigae | **Pendiente.** No hay par auditado en esta ficha; verificar identificación, calidad y método. | **Pendiente.** Saturación reportada en `STATE`; verificar sobre los píxeles y la banda utilizados. |
| R Draconis | **Pendiente.** No hay par auditado en esta ficha; verificar identificación, calidad y método. | **Pendiente.** Saturación reportada en `STATE`; verificar sobre los píxeles y la banda utilizados. |

Los enlaces directos a los archivos y cálculos exploratorios de los dos pares están en [0031](0031-controles-wise-0855.md) y [0032 §4](0032-criterios-cuantitativos-validacion.md). Los valores e identificadores de la vista se recopilaron en otra sesión; los controles nuevos no volvieron a descargar ni verificar los FITS.

## Cómo investigar límites para un método y un caso

1. **Alineación:** seleccionar referencias identificadas, no saturadas y separadas del objetivo; ajustar la transformación con una parte y medir residuos con otras. Repetir entre exposiciones y posiciones. Registrar sesgo y dispersión por eje y correlaciones; comprobar que el error residual es aceptable para la incertidumbre que se busca. El margen aceptable debe justificarse para la medición concreta. Los 0,3″ por eje son una hipótesis provisional, no una garantía ni sustituto del control local.
2. **Recuperación controlada:** inyectar fuentes o desplazamientos conocidos *etiquetados como sintéticos* en imágenes o fondos reales, ejecutar el mismo método que medirá Mateo y comparar resultado con valor inyectado. Variar ruido, vecinos, posición dentro del píxel, PSF y FLAGS; medir sesgo, cobertura del error y falsos positivos. Las pruebas actuales solo ejercitan controles y estadística con entradas sintéticas: **aún no recuperan fuentes de imágenes**.
3. **Espectro y brillo:** comprobar la calibración vinculada y la longitud de onda y ancho locales; estimar el sesgo fotométrico para el espectro y las respuestas pertinentes o con controles empíricos, y compararlo con un margen de error justificado. La página de [calibraciones espectrales IRSA](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/spherex_spectral_calibrations.html) ofrece curvas representativas promediadas; no atribuirles precisión individual por píxel sin validación adicional. El 0,02 se conserva como preselección provisional del ejemplo, no como límite NASA ni para otros objetivos.
4. **Decisión:** registrar muestra, método, incertidumbre, resultados, limitaciones y versión. Solo entonces proponer un límite para ese método y caso y obtener revisión humana. Un valor genérico de rendimiento de misión no prueba la precisión local de una observación.

## Mensajes del producto propuestos (UI en inglés)

| Situación | Texto propuesto | Significado |
| --- | --- | --- |
| Diferencia visible sin controles completos | “A visual difference is visible. Its cause has not been established.” | Solo apariencia; no atribuir movimiento ni brillo. |
| Faltan datos | “Comparison pending: required evidence is missing.” | Mostrar además cuáles controles faltan y por qué. |
| Incompatibilidad demostrada | “These observations cannot be compared with this method.” | Explicar el control rechazado. |
| Par apto para medir | “The required checks support applying this measurement method.” | No implica que se haya medido un cambio. |
| Diferencia no distinguible del error | “These data do not establish a difference.” | No implica que la fuente sea constante o inmóvil. |
| Cambio evaluado tras todos los controles | “The measured position/brightness differs between these observations.” | Explicar incertidumbre, limitaciones y procedencia; nunca asignar confirmado automáticamente. |

## Dependencias inmediatas

- **Johann:** productos versionados y metadatos verificables, WCS, FLAGS, VARIANCE, calibración y trazabilidad píxel original → recorte; puede existir ya parte en el backend pero hay que comprobarla para el par.
- **Mateo:** posiciones por época, selección de fuente y referencias, ajuste y sus incertidumbres/correlaciones, calidad, método y reproducción con FLAGS. Su rama `docs/analysis-review-fixes` en `931e94a` limita la primera entrega al movimiento candidato; no se ha incorporado a `main` en el último fetch.
- **Sebastián:** auditar evidencia, definir aceptabilidad local y mensajes; no puede convertir un supuesto o un dato ausente en una validación. Para cerrar un caso integrado son necesarias las aportaciones anteriores o equivalentes verificables.
