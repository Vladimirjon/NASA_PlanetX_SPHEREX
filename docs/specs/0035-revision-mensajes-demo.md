# Revisión científica de los mensajes de la demo

Responsable: Sebastián · 14-nov-2026 · **Revisión estática; correcciones pendientes de Daniel y dueños del backend.** No se cambiaron la UI, los datos ni los contratos de otros responsables. Base examinada: `scientific-rules` `fd0a958`; contraste con `origin/main` `4fe5d25`. Los archivos de UI y backend citados no difieren entre esas dos versiones. Esta revisión no sustituye una prueba visual en navegador.

## Lo más urgente

| Prioridad | Evidencia en código/datos | Riesgo | Acción solicitada y texto propuesto para Daniel/equipo |
| --- | --- | --- | --- |
| Alta | `backend/src/skyshift/application/build_series.py`, `_checks`: `aligned_to_common_grid` se marca `True` tras poner datos en una cuadrícula; no mide errores locales con estrellas. | El público puede confundir reproyección con alineación verificada. | Explicar **“Images are displayed on a common grid. Alignment accuracy has not been verified.”** Mantener pendiente el control científico de registro hasta medir sus residuos. |
| Alta | El backend entrega `change_significance=False` con detalle “not computed”; `frontend/src/app/components/time-panel.tsx` lo muestra como `FAIL`. | No calculado parece una prueba que falló. | Mostrar **“Not checked: change significance has not been measured.”** Separar no medido de fallo demostrado; coordinar el cambio de datos/contrato con sus dueños. |
| Alta | `quality_flags=True` describe comprobaciones generales `FINAST` y `L2DQA`; `flags_clear_at_target` es otro control. | “Quality passed” puede parecer que toda la calidad de la fuente ya fue validada. | Mostrar **“Image-level pipeline checks passed; local quality and uncertainty require separate review.”** No interpretar una comprobación general como validación completa. |
| Alta | En `frontend/src/series/core/explain.ts`, `describeWavelength` dice “the same colour in every frame within …”; la selección se basa en tolerancia numérica. | Da a entender que la respuesta espectral de las imágenes es idéntica. | **“The selected wavelengths are close. This alone does not establish equivalent spectral response.”** Mostrar longitud de onda y tolerancia reales sin prometer equivalencia. |
| Alta | El círculo procede de `predicted_position` (`canvas-renderer.ts`), y `motionProvenanceLabel` describe una posición esperada; no es una detección. | Se puede interpretar que el círculo demuestra que se ha visto el objeto, especialmente en WISE 0855. | **“Ring: predicted position; the object may not be detected in these images.”** Mostrar fuente real de la predicción y evitar asignar Gaia por defecto cuando no está verificado. |
| Alta | Modo diferencia: `canvas-renderer.ts` resta el primer cuadro del seleccionado y ajusta la escala de visualización; el panel no explica la incertidumbre ni una barra de escala para el residuo. | Una mancha visual puede parecer un movimiento o una variación medidos. | **“Difference from the first image. A visible pattern can also come from noise, alignment, background or image quality.”** Identificar ambas fechas, unidades y escala; indicar **“Measurement uncertainty not available.”** cuando no exista. |
| Media | El panel enseña colección, fecha y enlace IRSA de la imagen seleccionada. Longitud de onda y detector aparecen dentro de `Inspect`; el modo diferencia usa dos imágenes. | La procedencia de las dos imágenes y su λ pueden no quedar visibles al comparar. | Mostrar fecha, colección, λ y fuente de ambas imágenes en los modos de comparación; conservar los enlaces individuales. Verificar visualmente en escritorio, móvil y proyector. |
| Media | `frontend/public/demo/epsilon-indi-b/series.json`: detector D2 y cuatro imágenes; los archivos D3 del candidato están en ficha 0032. | Se puede creer que la demo D2 ya es el par D3 revisado para el caso de Mateo. | Identificar como **“Demo series: detector D2”** y, en documentación del equipo, distinguir el candidato D3. No etiquetar la serie D2 como validada ni asegurar que D3 sea el único par posible. |

En los cinco archivos `frontend/public/demo/*/series.json`, el nivel es `OBSERVED` y `change_significance` no está calculado. Es una observación de los datos de demo examinados, no una auditoría de respuestas posteriores de la API. Un nivel observado tampoco demuestra que el objeto objetivo esté presente o que realmente se haya detectado un cambio.

**Avance de Mateo:** la rama `feat/measurement-motion` en `3760e8a` contiene un resultado D3 candidato que incluye los dos archivos acordados; declara `threshold_exceeded_unverified` y `registration_unverified`. No se ha revisado científicamente aquí ni se encuentra en `main` en el commit consultado; no presentar el resultado como evaluado.

## Qué hacer sin cambiar el contrato de inmediato

1. **Daniel:** revisar textos de la vista y añadir explicaciones en inglés cerca de los controles y de la imagen. El mapeo visual de `change_significance` a «not checked» debe basarse en evidencia estructurada acordada; no inferir de cualquier `false` que un control no se ejecutó. Si el contrato booleano no permite distinguir casos de forma fiable, mostrar una limitación general mientras se acuerda una extensión.
2. **Johann / responsable del backend:** separar hecho de reproyección, verificación de registro y revisión de calidad local. Acordar con los consumidores los estados «no calculado», «aprobado» y «rechazado» antes de cambiar `contracts/openapi.yaml`.
3. **Sebastián:** revisar textos y evidencia del par D3 cuando lleguen los datos. Si no hay detección ni incertidumbre, la explicación debe decirlo; no convertir un resultado inconcluso en ausencia de movimiento.
4. **Equipo:** comprobar que los mensajes coinciden con lo que se ve en el navegador, con una persona sin formación astronómica, en escritorio y móvil. Las capturas y revisión humana están pendientes.

## Guion breve para el pitch

> “SkyShift muestra imágenes reales de una región del cielo tomadas en distintos momentos. Una diferencia visual es una pista: también puede deberse a ruido, alineación o calidad de imagen. Antes de hablar de un cambio medido revisamos los datos originales, la posición, la calidad y los errores.”

No afirmar detección de WISE 0855 en una exposición, validación del par D3, ni un descubrimiento. Las reglas científicas y fuentes están en [0030](0030-validacion-interpretacion-cientifica.md), [0032](0032-criterios-cuantitativos-validacion.md) y [0034](0034-controles-casos-y-limites.md).
