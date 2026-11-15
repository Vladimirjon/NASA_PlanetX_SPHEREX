# Scientific validation / Validación científica

## Español

`science.validation` ofrece funciones sin red para que Mateo pueda integrar controles científicos sin copiar umbrales ocultos:

- `check_observation_identity(a, b)`: comprueba identificadores de producto y adquisición, identidad declarada y fechas UTC. La persona o el módulo que alimenta la función debe resolver la identidad contra los productos originales.
- `spectral_check(lambda_a, lambda_b, band_a, band_b, threshold)`: calcula `|λa − λb| / min(ancho_a, ancho_b)` en las mismas unidades. El umbral se entrega explícitamente; superar este filtro no demuestra respuestas espectrales equivalentes. El 0,02 de la vista es provisional y solo corresponde al ejemplo de brillo de ε Indi B.
- `check_signal_to_noise(snr, threshold)` y `check_flags(observed, policy)`: aplican exclusivamente el umbral de señal y la clasificación de bits que proporcione el llamador. El código no impone una política universal de FLAGS.
- `flux_difference(a, b, sigma_a, sigma_b, covariance)`: calcula diferencia e incertidumbre con la covarianza entre épocas explícita; no asume independencia ni convierte una no detección en flujo cero.
- `astrometric_p_value(delta, covariance)`: calcula el estadístico bidimensional y la probabilidad bajo una hipótesis gaussiana con covarianza válida. El llamador debe justificar el modelo, las unidades y las correlaciones; el resultado no asigna un nivel científico.
- `compare_significance(p_value, sigma_threshold, trials)`: compara una probabilidad individual con un umbral gaussiano bilateral explícito y una corrección de Bonferroni con el número de pruebas indicado. La selección, el modelo estadístico y la cifra de pruebas deben estar justificados por el llamador; el resultado no confirma descubrimientos.
- `aggregate_checks(checks, stage=...)`: bloquea la elegibilidad si falta cualquier control, hay advertencias o la etapa es preselección. Los estados son **aportados por el llamador**, que es responsable de obtener y validar su evidencia; esta función no inspecciona FITS ni mide el cielo.

`science.checklists.build_checklist` genera listas distintas para movimiento y brillo con estado, motivo y referencias aportadas. Las referencias no se verifican automáticamente; aprobar todos los controles solo permite aplicar el método, no demuestra un cambio. Regenerar los informes exploratorios de los pares reales con `python -m science.checklists`; ver [ficha 0034](../docs/specs/0034-controles-casos-y-limites.md) para sus límites y pasos pendientes.

La vista emplea `science.preview.build_report`; exige fuentes explícitas para considerar un control externo como aprobado y nunca convierte el filtro espectral en aprobación espectral. No se generan `AnalysisResult` ni se cambia ningún esquema compartido. Las funciones no asignan automáticamente `confirmed`.

Con Python 3.11 o superior, en Fedora y Windows, desde la raíz del repo:

```text
python -m unittest discover -s tests -v
python -m science.preview
python -m http.server 8765 --bind 127.0.0.1 --directory science_preview
```

Si el equipo usa `mise`/`uv`, puede ejecutar cada comando Python con `uv run --no-project python ...`. Abrir `http://127.0.0.1:8765/`. La vista es local; no se despliega en Internet. Para detener el servidor, presionar Ctrl+C en su terminal.

## English

`science.validation` provides offline helpers for observation identity, an explicitly configured wavelength prefilter, a two-dimensional Gaussian astrometric statistic, and conservative aggregation of supplied checks. These helpers do not read FITS files, validate external evidence, measure objects, or confirm discoveries. See the Spanish section above for commands; the API uses no third-party runtime dependencies.

The static local preview uses real IRSA cutout pixels and intentionally leaves unverified controls pending. The candidate cases are exploratory and are not scientific detections.
