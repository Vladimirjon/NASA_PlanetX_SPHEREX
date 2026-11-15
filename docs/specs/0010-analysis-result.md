> Estado tras revisión 2026-11-14: ver docs/reviews/2026-11-14-triage-specs-main.md. Implementación vigente: contracts/openapi.yaml v0.2 y docs/specs/0002.
>
> **Revisión de Mateo (14-nov, noche):** esta versión corrige los puntos ERRÓNEO/CONTRADICE del triage (pasadas > 45 d, máscara `COMPARE_MASK`, paralaje, WCS-WAVE para selección), incorpora el 2.º mensaje de Sebastián (R12 con χ², C_WCS por eje, R6 como preselección) y la revisión de Johann. `AnalysisResult` **no** está en `contracts/openapi.yaml` (v0.3 vigente): sigue siendo propuesta. La sección 0 fija el alcance de la primera entrega según la revisión de Sebastián.

# Ficha de tarea para agente — Mediciones temporales (`AnalysisResult`)

- Dueño humano: Mateo (rango de fichas 0010–0019)
- Estado: **aprobada para la primera entrega** (alcance de la sección 0) por Sebastián, 14-nov-2026, noche (comunicado por Mateo). El resto de la ficha (brillo, otras regiones) sigue en borrador.
- Revisores: Sebastián (ciencia), Johann (frontera con `Observation`), Dax (backend: integración y dependencias ya aprobadas el 14-nov)
- Depende de: [0001 — Arquitectura de datos y `Observation`](0001-arquitectura-observation.md) (borrador de Johann, en `main`)
- ADRs relacionados: 0003 (stack recomendado), 0010 (stack del módulo, propuesta). Pendiente: ADR de alcance MVP (guiado vs. libre).
- **Criterios científicos:** R6, R11, R12, el modelo de incertidumbre y las condiciones del caso son los **propuestos por Sebastián** en su mensaje del 14-nov-2026, adoptados aquí como **provisionales** hasta que su ficha (`ScientificCase`) los publique. Esta ficha los citará entonces en vez de duplicarlos.

> **Etiquetas.** `[medido]` = probado con datos reales el 14-nov-2026. `[doc]` = documentación oficial. `[inferencia]` = razonamiento sin prueba directa. `[VERIFICAR]` = falta respaldo. `[DECISIÓN EQUIPO]` / `[DECISIÓN SEBASTIÁN]` = no lo decide este módulo ni un agente.
>
> **Regla del módulo:** este módulo **mide**, no **interpreta**. Devuelve números con unidades, incertidumbre, método y advertencias. Nunca dice "es un asteroide", "es Planet X" ni asigna el semáforo; eso lo hace `ScientificCase` (Sebastián).

---

## 0. Alcance de la primera entrega (lo que se pide aprobar)

Condiciones de Sebastián (revisión del PR #8, 14-nov, noche), aceptadas tal cual:

| # | Condición | Qué significa en esta ficha |
| --- | --- | --- |
| A1 | **Solo movimiento de ε Indi B, como candidato** | La primera entrega implementa solo la tarea (a) `astrometric_shift` para ε Indi B. El resultado es un **candidato de movimiento**: el software **nunca** asigna "evaluado" en esta entrega, aunque `Q` supere el umbral. Como máximo se muestra "observado", con la lista de controles pendientes (§4.4). |
| A2 | **El brillo queda fuera** | La tarea (b) `flux_change`, R6, R-2, R-3 y el anexo B.3 quedan para una **segunda entrega**. En la primera, `photometry: null` (válido según §3). |
| A3 | **Resultados reales pendientes de recalcular** | Todos los números del anexo B (movimiento, flujos y SNR) son sondeos exploratorios **sin FLAGS aplicados, sin paralaje y sin covarianzas**. Se marcan `[PENDIENTE DE RECALCULAR]` y no se citan como resultado del producto ni en el pitch hasta recalcularlos con el método aprobado. |
| A4 | **Q ≥ 28,7437 solo bajo los supuestos de la ficha** | El umbral vale únicamente si se cumplen: errores gaussianos, `C_Δ` estimada correctamente (§4.3), una sola prueba definida de antemano (sin buscar entre muchas) y una hipótesis nula clara (sin desplazamiento). Si un supuesto no se cumple o no se comprobó, se reporta `Q` y `p`, pero **no** `change_measured`. |
| A5 | **0,3″ por eje es provisional** | `C_WCS = diag(0,09; 0,09)` arcsec² es una aproximación que **debe contrastarse con referencias del campo** (tarea 9b del plan 0011). Sin ese contraste, el resultado lleva `registration_unverified` y la incertidumbre se declara como no validada. |
| A6 | **Cálculo puro en `backend/src/skyshift/domain/`, sin duplicar `science/validation.py`** | La prueba χ² (`astrometric_p_value`) y la diferencia con covarianza son las de Sebastián. Este módulo las **reutiliza**: su ubicación final en `domain/` se coordina con Sebastián y Johann. No se reimplementan. |

**Fuera de la primera entrega:** brillo, las otras cuatro regiones, la API HTTP (`AnalysisResult` no está en `contracts/openapi.yaml` v0.3) y cualquier nivel por encima de "observado".

**Contrato implementado (primera entrega):** `contracts/analysis-result.schema.json` (borrador 0.1) fija `kind = astrometric_shift`, `photometry = null` e `interpretation_ceiling = OBSERVED`, y agrega el resultado `threshold_exceeded_unverified` para A4.

**Cómo llega a la app:** un JSON precalculado offline, validado contra `contracts/analysis-result.schema.json`, como recurso estático de la demo en `frontend/public/demo/` (aprobado por Dax, Daniel y Johann el 14-nov). Así no cambia la API.

## 1. Objetivo funcional

Dadas ≥ 2 `Observation` (ficha 0001) de la misma zona y una posición objetivo, producir un `AnalysisResult` reproducible que responda **una** de dos preguntas:

| Tarea | Pregunta que responde | Unidad del resultado |
| --- | --- | --- |
| **(a) Desplazamiento aparente** (`astrometric_shift`) | ¿La posición en el cielo de la fuente cambió entre fechas, más allá del error de medición? | arcsec y arcsec/año (en RA·cos Dec y Dec) |
| **(b) Cambio de flujo** (`flux_change`) | ¿El flujo de la fuente, **a la misma longitud de onda**, cambió entre fechas, más allá del error? | µJy y razón adimensional B/A |

Si no se puede responder con honestidad, el resultado válido es **un rechazo explicado** (`not_evaluable`) o **"sin detección utilizable con este criterio"** (`no_usable_detection`), nunca un número dudoso. Un resultado bajo el umbral de cambio (`change_below_criterion`) **no** afirma que el objeto esté inmóvil o sea constante: solo que no supera nuestro criterio.

**Prioridad (acordada con Sebastián):** primero (a). ε Indi B es **candidato de movimiento**, todavía no caso evaluado (sección 4.4). La tarea (b) es un **control** a λ emparejada; la variabilidad real de brillo queda como opcional.

**Por qué medir en el cielo y no en píxeles:** cada imagen de SPHEREx tiene su propia orientación y distorsión (TAN-SIP) [doc]. Por eso se mide en el **marco nativo** de cada imagen, sin interpolar, y se pasa a RA/Dec con su WCS, que ya está calibrado contra Gaia DR3 con RMS < 0,3″ [doc, Expsupp §4.2.2]. La reproyección a una rejilla común queda para la **visualización** (blink e imagen diferencia de Daniel), no para la medición.

## 2. Entradas exactas

### 2.1 Lo que se lee de cada `Observation` (ficha 0001 §3)

| Campo de `Observation` | Exigencia de este módulo | Para qué |
| --- | --- | --- |
| `observation_id` + `identity_status` | `identity_status = resolved` para cualquier resultado publicado; `unresolved` → `not_evaluable` (`identity_unresolved`) | No mezclar versiones ni contar dos veces una adquisición |
| `source.acquisition_id`, `detector` | Obligatorios | Las 6 filas de un mismo `obs_id` comparten tiempo: no son 6 fechas (0001 §4.1) |
| `time.samples` con `role = midpoint`, `scale = "UTC"` leído de la cabecera (`MJD-AVG`) | Obligatorio. Una muestra solo de SIA (`scale = null`) no basta para publicar | Δt y ajuste de movimiento |
| `time.exposure_s` (de `XPOSURE`, no `TELAPSE`) | Obligatorio | Contexto; `XPOSURE` es el tiempo de integración (cabecera) |
| `spatial_wcs` (`HduRef` a la cabecera `IMAGE` completa, con SIP) | Obligatorio | Píxel → RA/Dec |
| `spectral.local` | Solo como punto de referencia de la `Observation`. **La λ de cada medición la lee este módulo** con `CWAVE`/`CBAND` en el píxel medido (acordado con Johann, `STATE.md` 14-nov), porque un objeto en movimiento cae en otro píxel en cada fecha | Referencia |
| `products.calibrations` | Debe apuntar al Spectral WCS vinculado por la regla de 0001 §3.5; si no, `calibration_unresolved`. Con `wcs_wave_approximation` la tarea (b) es `not_evaluable` | Leer `CWAVE`/`CBAND` en el píxel medido |
| `quality.flags`, `quality.variance` | Obligatorios; sin `VARIANCE` → `not_evaluable` | Excluir píxeles, incertidumbre |
| `quality.pipeline_assessment` | Se copia como procedencia; **no** se usa como control (todo lo publicado es `FINAST=0`, `Pass`; 0001 §7.4 E) | Guarda defensiva |
| `ancillary` (`EPSF`, `ZODI`) | Opcional según método | Ajuste PSF / fondo |
| `products.native` o `products.derived` (recorte) con `Transformation` | Obligatorio uno de los dos; un recorte debe traer el origen de píxel (`CRPIX1A`, `CRPIX2A`) | Volver al píxel original para leer `CWAVE` |

**Ojo técnico (0001 §7.4 I) [medido]:** astropy aplica la distorsión SIP también a las WCS alternas `A` y `W` si los coeficientes están en la cabecera. Hay que quitarlos (`wcs.sip = None`) en esas WCS; si no, el error es de ~0,15 px. En la WCS espacial principal la SIP **sí** se usa.

**Píxel original desde un recorte de IRSA [medido]:** píxel original (base 0) = píxel del recorte (base 0) + 1 − `CRPIXnA`.

### 2.2 Entradas que no vienen de `Observation`

| Campo | Unidad | Obligatorio | Nota |
| --- | --- | --- | --- |
| `region_ref` | `{region_id, revision}` | sí | Contrato `Region` (Dax + Johann) |
| `target.reference_position` | RA/Dec en grados ICRS + época (año juliano) + fuente | sí | Dónde buscar. Si el objeto tiene movimiento propio, se **propaga** a la fecha de cada observación (`SkyCoord.apply_space_motion`). Se hace aquí y no en `Region` (0001 §6.4: `Region` es fija) |
| `target.reference_motion` | arcsec/año + fuente | opcional | Solo para **comparar** al final con un catálogo independiente; nunca para fabricar la medición |
| `kind` | `astrometric_shift` \| `flux_change` | sí | |

## 3. Salidas exactas — contrato `AnalysisResult` (`0.1-draft`)

Nombres en inglés (`AGENTS.md` §5). Mismo estilo de versión, nulabilidad y `issues` que `Observation` (0001 §3.2): `null` = desconocido, nunca cero ni aprobado. Siguiendo a Johann, el borrador verificable irá a `contracts/analysis-result.schema.json` (JSON Schema, como `observation.schema.json`) y se valida con `mise run check-contracts`; el manifiesto offline lo referencia en `cases[].analysis_refs`.

```yaml
AnalysisResult:
  schema_version: "0.1-draft"
  analysis_id: string            # estable, p. ej. "AR-<region_id>-<kind>-<nnn>"
  created_utc: string            # ISO-8601 UTC del cálculo
  kind: astrometric_shift | flux_change
  is_synthetic: boolean          # true en fixtures de prueba; la UI lo rotula siempre
  region_ref: {region_id: string, revision: string}
  target:
    label: string | null         # nombre de catálogo si existe; nunca una clasificación inventada
    reference_position: {ra_deg, dec_deg, frame: "ICRS", epoch_jyear, source}
    reference_motion: {pm_ra_cosdec_arcsec_per_yr, pm_dec_arcsec_per_yr, source} | null
  inputs:                        # >= 2
    - observation_id: string     # ficha 0001
      product_id: string         # products.native o products.derived exacto que se midió
  comparability:
    status: comparable | comparable_with_warnings | not_comparable
    checks:                      # uno por regla de la sección 4
      - {check_id, status: pass | warn | fail | not_evaluated, observed_value, criterion, source}
  outcome: change_measured | threshold_exceeded_unverified | change_below_criterion | no_usable_detection | not_evaluable | data_error
  # threshold_exceeded_unverified: Q ≥ umbral pero sin verificar los supuestos A4 (§0): NO es change_measured
  criteria_ref: {source, version}  # p. ej. {"Sebastián, mensaje 14-nov-2026", "provisional"}; luego su ficha
  measurements:                  # una fila por entrada, usada o descartada
    - observation_id: string
      time_mjd_utc: number       # midpoint (MJD-AVG), d
      x_pix: number              # base 0, píxel ORIGINAL del detector
      y_pix: number
      ra_deg: number             # ICRS
      dec_deg: number
      cov_pos_arcsec2: [[number, number], [number, number]]   # covarianza (RA·cosDec, Dec) de esta posición
      wavelength_um: number      # CWAVE en el píxel medido
      bandwidth_um: number       # CBAND en el píxel medido
      wavelength_method: cwave_cband | wcs_wave_approximation
      flux_ujy: number | null
      flux_err_stat_ujy: number | null
      flux_upper_limit_ujy: number | null   # si no hay detección utilizable; nunca flujo cero
      snr: number | null
      detection: usable | not_usable
      flags_bitmask: integer     # OR de FLAGS en radio 2,5 px
      flag_names: [string]
      used: boolean
      excluded_reason: string | null
  astrometry:                    # solo si kind = astrometric_shift; null si no se midió
    model: two_epoch_difference | linear_fit
    delta_t_days: number
    delta_ra_cosdec_arcsec: number
    delta_dec_arcsec: number
    separation_arcsec: number
    position_angle_deg: number   # de N hacia E
    cov_delta_arcsec2: [[number, number], [number, number]]  # covarianza de la diferencia: suma de ambas épocas + correlaciones
    rate_arcsec_per_yr: number
    cov_rate: [[number, number], [number, number]] | null    # (arcsec/año)², si model = linear_fit
    test: {statistic: chi2, value, dof: 2, p_value, equivalent_sigma_two_sided, tested_quantity: displacement | proper_motion}
                                 # Q = Δᵀ C⁻¹ Δ; p = exp(−Q/2); z = Φ⁻¹(1 − p/2). NO separation/σ, NO √Q (§4.3)
    covariance_assumption: independent_epochs | with_cross_covariance
    fit_residual_rms_arcsec: number | null
    residuals_vs_wavelength: {slope_arcsec_per_um, sigma, n} | null     # control Ba/Bb (sección 4.4)
    reference_star_check: {n_stars, rms_arcsec, catalog, catalog_version} | null
    external_references:        # contraste, no evaluación automática
      - {catalog, identifier, version, epoch_jyear, pm_ra_cosdec, pm_dec, pm_uncertainties,
         parallax_mas, object_relation: same_object | common_proper_motion_companion,
         independence_note}
  photometry:                    # solo si kind = flux_change; null si no se midió
    wavelength_match: {lambda_a_um, lambda_b_um, delta_lambda_um, delta_over_min_cband, preselection_tolerance, tolerance_source,
                       spectral_bias_validated: boolean}   # pasar 0,02 NO valida; ver R6
    flux_a_ujy: number
    flux_b_ujy: number
    delta_flux_ujy: number
    sigma_delta_flux_ujy: number # propaga ambas épocas + término de 3 % (sección 4.3)
    ratio_b_over_a: number
    sigma_ratio: number
    significance_sigma: number   # |Δ| / σ_Δ (una dimensión)
  zone_of_interest: {ra_deg, dec_deg, radius_arcsec}   # para que la UI resalte
  method:
    name: string                 # p. ej. "native-frame-gaussian-centroid"
    version: string
    parameters: object           # radios, ventanas, bits de máscara usados
    software: [{name, version}]
  issues: [{code, severity: info | warn | block, paths: [string], detail}]
  provenance:
    code_ref: string             # commit git
    computed_by: offline_precompute | backend
    executed_at: string          # ISO-8601 UTC
```

**Códigos de `issues` propuestos** (lista cerrada; la severidad final es `[DECISIÓN SEBASTIÁN]`):

| Código | Cuándo | Severidad propuesta |
| --- | --- | --- |
| `identity_unresolved` | alguna entrada con `identity_status = unresolved` | `block` |
| `calibration_unresolved` | no hay `CWAVE`/`CBAND` vinculados (0001 §3.5) | `block` en flujo; `info` en posición |
| `wavelength_mismatch` | Δλ/CBAND por encima de la tolerancia | `block` en flujo; `info` en posición |
| `bad_pixels_near_target` | algún bit de `COMPARE_MASK` (`0x3FD2CEC7`, D12 §3) en r ≤ 2,5 px | `block` esa medición |
| `outlier_near_target` | bit `OUTLIER` (19) en r ≤ 2,5 px: se marca, no se enmascara (D12 §3) | `warn` (impide "evaluado") |
| `saturation_risk` | objetivo más brillante que el límite de la Tabla 25, o bits `OVERFLOW`/`NONLINEAR` | `block` en flujo; `warn` en posición `[VERIFICAR]` |
| `low_snr` | SNR < 5 en esa exposición (R11) | esa exposición no se usa; si no queda ninguna → `no_usable_detection` |
| `wavelength_dependent_position` | los residuos de posición dependen de λ (sección 4.4, Ba/Bb) | `warn`; `block` si la pendiente explica el movimiento `[DECISIÓN SEBASTIÁN]` |
| `registration_unverified` | no se comprobó el registro con estrellas de referencia del recorte | `warn` (impide pedir "evaluado") |
| `uncertainty_inflated` | los residuos superan lo esperado y se infló σ_wcs (sección 4.3) | `info` |
| `target_off_footprint` | el objetivo cae fuera de la imagen o del recorte | `block` |
| `neighbor_confusion` | otra fuente a < 2 px | `warn` |
| `insufficient_epochs` | < 2 **pasadas** distintas utilizables (salto > 45 d, D12 §5.2) | `block` → `not_evaluable` (mismo nombre que 0001 §4.4) |
| `insufficient_baseline` | Δt tan corto que el movimiento esperado < σ | `warn` |
| `parallax_not_modeled` | no hay paralaje conocido para propagar la posición esperada (D12 §7 exige movimiento propio + paralaje cuando se conocen) | `warn`; impide "evaluado" |
| `pipeline_quality_unexpected` | `FINAST` ≠ 0 o `L2DQAFLG` ≠ `Pass` (no debería ocurrir en lo publicado) | `block` |
| `synthetic_data` | `is_synthetic = true` | `info` (la UI lo muestra siempre) |

**Ejemplo con datos reales (sondeo exploratorio, no es un resultado del producto):** las 12 mediciones de ε Indi B del anexo B son las filas que llenarían `measurements` y `astrometry`.

**Lo que este contrato NO contiene, a propósito:** nivel del semáforo, texto para el público, "tipo de objeto". Sebastián los deriva de `outcome`, `comparability`, `issues`, `test` y `significance_sigma` en `ScientificCase`. Las referencias externas (Hipparcos/Gaia) son contraste y nunca otorgan solas el nivel "evaluado"; "confirmado" nunca lo asigna la app.

## 4. Restricciones científicas (precondiciones de comparación)

> R6, R11 y R12 llevan los valores **propuestos por Sebastián** (mensaje del 14-nov-2026), provisionales para el MVP. No son garantías ni tolerancias universales.

### 4.1 Reglas

| # | Regla | Tarea | Si falla | Fuente |
| --- | --- | --- | --- | --- |
| R1 | ≥ 2 **pasadas** distintas: imágenes ordenadas por tiempo, nueva pasada si el salto es > 45 d (`domain/visits.py`). Varias adquisiciones, detectores o versiones dentro de una pasada no cuentan como épocas | a, b | `not_evaluable` (`insufficient_epochs`) | D12 §5.2 y §6 paso 4; triage 14-nov; 0001 §4.1 |
| R2 | El objetivo cae dentro de cada imagen o recorte | a, b | descartar esa imagen | — |
| R3 | Guarda defensiva: `FINAST == 0` y `L2DQAFLG == 'Pass'` | a, b | `pipeline_quality_unexpected` | Expsupp §3.2.8; IRSA solo publica imágenes así (0001 §7.4 E), así que **no discrimina** entre productos |
| R4 | Identidad resuelta y calibración vinculada | a, b (calibración solo en b) | `identity_unresolved` / `calibration_unresolved` | 0001 §3.1 y §3.5 |
| R5 | Mezclar DR1 y QR3 está permitido: mismo pipeline `v27` y las mismas 15 calibraciones [medido por Johann]. QR2 no aparece en la búsqueda actual | a, b | — | 0001 §7.4 C; Expsupp §2.1 |
| R6 | **Preselección, no validación:** Δλ / min(CBAND₁, CBAND₂) ≤ 0,02 con `CWAVE`/`CBAND` en la posición medida de cada época, solo para el control de brillo de ε Indi B. Pasarla **no** basta: además hay que demostrar que el sesgo espectral `|δF/F| ≈ |d ln F̄/dλ|·|Δλ|` (espectro integrado sobre la respuesta) es menor que el margen del método. Ejemplo calculado: con CBAND ≈ 0,0469 µm, 0,02 admite Δλ ≈ 0,94 nm; para un sesgo ≤ 3 % haría falta una pendiente efectiva < ≈ 32 µm⁻¹, **no medida todavía**. No se puede estimar la pendiente con el mismo par que se evalúa | b | Falla → `not_comparable` (`wavelength_mismatch`). Pasa sin sesgo validado → `spectral_bias_validated = false`, `issue` `spectral_bias_unverified` y la diferencia **no** se interpreta como variabilidad | Sebastián (14-nov, 2.º mensaje) + 0032 §3.2 + trampa LVF [doc] |
| R7 | Ningún bit de **`COMPARE_MASK` = `0x3FD2CEC7`** en r ≤ 2,5 px del objetivo (bits 0, 1, 2, 6, 7, 9–11, 14, 15, 17, 20, 22–29; incluye `OVERFLOW` y `GHOST*`). Se reutiliza `domain/flags.py`. Contiene la lista de fotometría de Expsupp §3.3, así que vale para posición y flujo | a, b | descartar esa medición | D12 §3 y §6 paso 13; triage 14-nov |
| R8 | `OUTLIER` (bit 19) no se enmascara: se marca y baja el semáforo | a, b | `outlier_near_target` | D12 §3 |
| R9 | **`SOURCE` no es un problema**: marca píxeles de fuentes conocidas (51 % del detector en una imagen de prueba) | a, b | — | Expsupp Tabla 16 + `PXSRCMSK=51.16` [medido] |
| R10 | Objetivo no saturado: más débil que ~11,3–11,7 AB (D1–D4), 10,2 AB (D5), 9,75 AB (D6) | b (a: advertir) | `not_comparable` | Expsupp Tabla 25 (modelo pre-lanzamiento de no linealidad) |
| R11 | Detección utilizable: **SNR ≥ 5 por exposición usada**, además de calidad (R7), identificación y ajuste aceptables. Política del MVP, no garantía de detección | a, b | esa exposición no se usa; sin ninguna → `no_usable_detection`, conservando flujo, incertidumbre y límite superior. Nunca flujo cero ni "desapareció" | Sebastián (14-nov) |
| R12 | Solo `change_measured` si el cambio es **≥ 5σ bilateral**. En posición: `Q = Δᵀ C_Δ⁻¹ Δ` (χ², 2 g.l.); se cumple si `p = e^{−Q/2} ≤ 5,7330314376 × 10⁻⁷`, es decir `Q ≥ 28,7437024269`. El código **calcula** el umbral (no usa 28,7 redondeado, ni 25, ni √Q, ni separation/σ). Con varias fechas se prueba el **vector de movimiento** con su covarianza, no el χ² de los residuos. En flujo: \|F_B − F_A\| / σ_ΔF | a, b | `change_below_criterion`: se conserva la medición; no se afirma que el objeto sea inmóvil o constante. La significancia es local a esta prueba y supone errores y covarianzas adecuados | Sebastián (14-nov, 2.º mensaje) + 0032 §3.3 |

### 4.2 Cosas que **no** se deben asumir

- Mismo detector ≠ misma λ. Medido: en D3, ε Indi B cayó entre 1,638 y 2,375 µm según la imagen (anexo B); Johann vio lo mismo en WISE 0855 (0001 §7.4 B).
- Fecha de publicación (`time.release_date`) y fecha de procesamiento ≠ fecha de adquisición.
- Colores reescalados para la pantalla no son flujo. El flujo se mide en MJy/sr → µJy, nunca sobre el PNG.
- Una "época" dura semanas (anexo B.1). Un objeto rápido se mueve **dentro** de ella: se usa el tiempo de cada exposición.
- `WCS-WAVE` es aproximada (0001 §3.5). Sirve para **seleccionar** imágenes (D12 §2.2, ficha 0002, `build_series.py`), con la advertencia de los bordes. Para **medir** y para R6 se usa `CWAVE`/`CBAND`. En las 12 imágenes de ε Indi B difieren solo entre +0,15 y +0,75 nm [medido], pero cerca del borde llega a 0,52 µm (0001 §7.4 D).
- Hay **dos criterios de λ con fines distintos**: la serie/blink usa `|Δλ| ≤ λ/(4R)` (D12 §6.6, ≈ 0,25 × CBAND) y el control de brillo de ε Indi B usa la preselección R6 (0,02 × CBAND), unas 12 veces más estricta. D12 justifica λ/(4R) con un espectro suave, pero advierte que las enanas marrones (CH₄, H₂O) pueden cambiar más. **Sebastián y Dax deben confirmar que esta diferencia es intencional** `[DECISIÓN SEBASTIÁN]`.

### 4.3 Modelo de incertidumbre (provisional, revisado con Sebastián)

- **Posición, por imagen:** `C = C_stat + C_WCS`, con `C_WCS = diag(0,09; 0,09) arcsec²` (0,3″ **por eje**, RA·cos Dec y Dec). Expsupp §4.2.2, figura 20, da RMS separados por eje, no un RMS radial: **no** se divide entre √2. Es una aproximación isotrópica **provisional**, no una covarianza garantizada por IRSA, y se contrasta con estrellas de referencia del mismo recorte (`reference_star_check`). Si sus residuos son mayores, se infla y se marca `uncertainty_inflated`. Motivo [medido]: el error estadístico del ajuste salió ~0,02″, pero la dispersión real entre imágenes fue de 0,2–0,4″. Sebastián midió un registro local exploratorio de ≈ 0,70″ RMS vectorial en ε Indi B (0032 §4.1), todavía no validado: no reemplaza 0,3″, pero muestra que el control local es obligatorio.
- **Diferencia de posición:** `C_Δ = C_A + C_B − C_AB − C_ABᵀ`. Si se supone independencia entre épocas, se documenta (`covariance_assumption = independent_epochs`) y se usa `C_A + C_B`. Ejemplo de correlación: dos detectores de la misma adquisición comparten apuntado.
- **Prueba:** `Q = Δᵀ C_Δ⁻¹ Δ` ~ χ² con 2 g.l.; `p = e^{−Q/2}`; σ equivalente bilateral `z = Φ⁻¹(1 − p/2)`. Para 5σ: `p ≤ 5,7330314376 × 10⁻⁷` y `Q ≥ 28,7437024269` [verificado con scipy]. **No** usar `√Q` como σ.
- **Ajuste lineal (N fechas):** se ajusta el vector de movimiento con su covarianza (ajuste ponderado; si χ²/g.l. de los residuos > 1, se escala la covarianza) y la prueba anterior se aplica a **ese vector**, no al χ² de los residuos.
- **Flujo:** `σ_total = √(σ_stat² + (0,03·F)²)` por medición, una sola vez. El 3 % **sí** está documentado como dispersión adicional del método de fotometría oficial (Expsupp §3.3, nota 1). Sebastián advierte (0032 §2) que la ecuación impresa parece dimensionalmente inconsistente y que no debe sumarse dos veces ni a métodos distintos sin justificar: se usa la descripción textual y se marca `[VERIFICAR]` para nuestra fotometría de apertura.
- La significancia se reporta siempre, incluso por debajo de 5σ.

### 4.4 Condiciones antes de evaluar el candidato ε Indi B (Sebastián, 14-nov)

| # | Condición | Cómo se cumple | Estado |
| --- | --- | --- | --- |
| C1 | Recalcular aplicando FLAGS (R7/R8) | Excluir las exposiciones con `SUR_ERROR`/`HALO` cerca del objetivo (anexo B.2 tiene dos) | **Hecho** (14-nov): 19 de 99 exposiciones excluidas por `COMPARE_MASK`; el movimiento se recalculó |
| C2 | Documentar archivos y fechas exactos | Lista de `product_id`, URL, versión y `MJD-AVG` de cada recorte en el manifiesto (`contracts/package-manifest.schema.json`) | **Hecho**: `inputs[]` y `measurements[]` del JSON (URL, `obs_id`, `MJD-AVG`) y `code_ref` |
| C3 | Comprobar el registro con estrellas de referencia | Estrellas Gaia del recorte, no saturadas y aisladas: RMS de sus residuos por imagen | **Hecho**: 15 estrellas Gaia, 76 exposiciones; dispersión 0,16″/0,21″ por eje (< 0,3″). Se rechazaron 102 ajustes sobre otra fuente (radio de identificación 1 px). Aceptabilidad: Sebastián |
| C4 | Propagar paralaje | Gaia DR3 da paralaje 270,658 ± 0,690 mas (D12 §7). La posición esperada se propaga con movimiento propio + paralaje (`domain/motion.py`); D12 estima ~0,2″ de efecto entre pasadas | **Hecho**: paralaje de Gaia restado antes del ajuste |
| C5 | Revisar sesgo del centroide | PSF sub-muestreada (FWHM ≈ 1,2 px): pruebas sintéticas con fase de píxel variable (plan 0011) o ajuste con ePSF | Parcial: pruebas sintéticas de recuperación (T1–T3) y de error; falta la recuperación inyectada en fondos reales (0034 §2) |
| C6 | **Ba/Bb no resueltas** | SPHEREx no separa las dos enanas: a distinta λ cambia el peso de cada una y el centro de luz puede moverse. Probar si los residuos de posición dependen de λ (`residuals_vs_wavelength`) y, si hace falta, usar solo λ parecidas | **Medido**: pendiente −0,09 ± 0,16 y −0,00 ± 0,16 ″/µm en 1,64–2,40 µm (compatible con 0). Aceptabilidad: Sebastián |
| C7 | Referencia externa adecuada | Gaia DR3 6412596012146801152 (época J2016,0): μα* = +3981,977 ± 0,602, μδ = −2466,832 ± 0,626 mas/año, paralaje 270,658 ± 0,690 mas (D12 §7). Es el **fotocentro** de Ba+Bb `[VERIFICAR]` y no es del todo independiente (el WCS de SPHEREx usa Gaia). Falta una solución publicada que separe Ba/Bb y su órbita | Parcial: contraste con Gaia DR3 (Δμ = −0,075 / −0,009 ″/año); falta una solución publicada de Ba/Bb |

## 5. Casos de prueba

Las pruebas **sintéticas** son para el código y van rotuladas (`is_synthetic: true`). Las pruebas con **datos reales** son para la ciencia y el pitch. Nunca se mezclan.

| # | Tipo | Caso | Resultado esperado |
| --- | --- | --- | --- |
| T1 | sintético | Dos imágenes idénticas (misma matriz, mismo WCS) | `change_below_criterion`, separación 0 dentro de σ |
| T2 | sintético | Misma escena con WCS desplazado globalmente, objeto quieto | separación ≈ 0 en el cielo. Si se midiera en píxeles fallaría (prueba de regresión) |
| T3 | sintético | Fuente gaussiana desplazada 1,0 px conocido, ruido conocido | `change_measured`, separación ≈ 6,15″ ± σ; el valor inyectado queda dentro de 2σ `[VERIFICAR criterio]` |
| T4 | sintético | Misma fuente, flujo ×1,5 en B, misma λ | `flux_change`, ratio ≈ 1,5 ± σ |
| T5 | sintético | B con escala/exposición distinta pero flujo físico igual | ratio ≈ 1 (no se compara "brillo de pantalla") |
| T6 | sintético | Píxel `HOT`, `OVERFLOW` o `GHOST` sobre el objetivo en B; aparte, `OUTLIER` | los tres primeros: medición B descartada (`bad_pixels_near_target`); `OUTLIER`: se conserva con `outlier_near_target` |
| T7 | sintético | `CWAVE` A = 1,65 µm, B = 2,38 µm | `flux_change` → `not_comparable` (`wavelength_mismatch`) |
| T8 | sintético | Objetivo con SNR < 5 en todas las exposiciones | `no_usable_detection`, con flujo, σ y límite superior (nunca 0) |
| T9 | sintético | Recorte con `CRPIX1A` = −375: el píxel original debe ser recorte + 376 | λ leída del píxel correcto; con un error de origen, `calibration_unresolved` |
| T10 | sintético | Entrada incompleta: sin `time.samples` UTC o sin `quality.variance` | `data_error` / `not_evaluable` con razón y `paths` |
| T11 | sintético | Dos filas del mismo `acquisition_id` (dos detectores) | `insufficient_epochs`: no son dos fechas |
| T12 | sintético | `identity_status = unresolved` | `identity_unresolved` |
| T13 | sintético | Diferencia con covarianza no diagonal (errores RA/Dec correlacionados) | `test.value` = Δᵀ C⁻¹ Δ calculado a mano; difiere de separation/σ |
| T14 | sintético | Dos fuentes no resueltas (separación < 1 px) con razón de flujo que cambia con λ | el centroide se mueve con λ → `wavelength_dependent_position` |
| T15 | sintético | Estrellas de referencia con residuos de 0,6″ (mayores que 0,3″) | `σ_wcs` inflado y `uncertainty_inflated` |
| R-1 | **real** | ε Indi B, D3, DR1 + QR3 (anexo B.2), tras C1–C3 | `change_measured` (≥ 5σ en χ² 2D; el sondeo da ~15σ entre primera y última fecha `[recalcular]`); consistente con la compañera de movimiento común. Sigue siendo **candidato** hasta C4–C7 |
| R-2 | **real** | ε Indi B a `CWAVE` 1,9341 vs. 1,9333 µm (Δλ/min(CBAND) = 0,017 ≤ 0,02) | `change_below_criterion` (+1,0 %, ≈ 0,2σ con el término de 3 %) |
| R-3 | **real** | ε Indi B a 1,6464 vs. 2,3753 µm | `not_comparable` (sin R6 daría un falso "−62 %") |
| R-4 | **real** | WISE 0855 en una sola exposición D5/D6 | `no_usable_detection` / `low_snr` (SNR medido de −0,0 a 4,7 < 5) |

## 6. Criterio de aceptación

1. **Contrato:** Sebastián puede escribir la interpretación de R-1, R-2 y R-3 (incluidos los casos bajo criterio) usando solo los campos de `AnalysisResult`, sin preguntar ni deducir datos faltantes.
2. **Rechazo explícito:** T6, T7, T9–T12 y R-3 devuelven la razón exacta (código, `paths` y detalle), no un número.
3. **Frontera con 0001:** cada `inputs[]` resuelve a una `Observation` y a un producto exacto; ningún campo de entrada se rellena con un valor por defecto.
4. **Reproducibilidad:** con el mismo `code_ref` y los mismos `product_id`, el resultado es idéntico.
5. **Ciencia:** en R-1 se cumplen C1–C7 (sección 4.4) y el movimiento es consistente con una referencia externa documentada (identificador, versión, época, incertidumbres), sabiendo que no es del todo independiente. Sebastián lo revisa; la app nunca asigna "confirmado".
6. **Pruebas:** T1–T15 pasan en CI (TDD, `AGENTS.md` §6) antes de decir "listo".

## 7. Fuentes

- SPHEREx Explanatory Supplement v2.0 (2026-08-25), SSDC-DP-017: §2.1 (versiones QR/DR1), §3.2.5 Tabla 16 (FLAGS), §3.2.8 y §4.2.2 (astrometría, `FINAST`, RMS < 0,3″), §3.3 (fotometría: uso de flags, `CONTAINS_BAD_PIXEL`, ec. 19, término de 3 %), Tabla 25 (saturación). https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf
- Ficha 0001 de Johann (`Observation`): §3.4–3.5 (λ por `CWAVE`/`CBAND`, vínculo de calibración), §7.4 (épocas, calidad publicada, recortes y origen de píxel).
- SPHEREx data products (IRSA): https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products
- Tutoriales IRSA: recortes, Source Discovery Tool (máscaras y conversión con ángulo sólido), PSF. https://caltech-ipac.github.io/irsa-tutorials/spherex/
- SPHEREx Spectrophotometry Tool (fotometría forzada con Tractor): https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html
- Akeson et al. 2025, "The SPHEREx Image and Spectrophotometry Processing Pipeline", arXiv:2511.15823.
- Spectral WCS D3 `dr1/spectral_wcs/cal-swcs-v5-2026-191/3/spectral_wcs_D3_spx_cal-swcs-v5-2026-191.fits` (misma versión en `qr3/`), leído por rango de bytes.
- 2MASS PSC y AllWISE vía IRSA Gator (magnitudes del anexo B.4).
- `docs/context/02-ciencia-para-cs.md`, `03-datos-y-apis.md`, onboarding v0.1.

---

## Anexo A — Alternativas técnicas

Opciones con pros y contras. **La selección es humana.** No se propone entrenar IA.

| Enfoque | Qué produce | Ventajas | Riesgos | Coste (hackathon) |
| --- | --- | --- | --- | --- |
| **A1. Blink guiado** (sin medición) | Animación A/B alineada | Lo más simple; es el "momento wow" | No mide nada: solo llega a "observado" | Bajo (es de Daniel) |
| **A2. Centroide en marco nativo + WCS** (gaussiana 2D o `photutils.centroids`) | RA/Dec por exposición → Δ en arcsec + ajuste lineal | Sin interpolación; usa el WCS ya calibrado con Gaia; **probado** (anexo B.2) | PSF sub-muestreada (FWHM ≈ 1,2 px): sesgo de fase de píxel `[VERIFICAR magnitud]`; falla con estrellas saturadas | Bajo |
| **A3. Ajuste PSF con la ePSF oficial** (`photutils`, sobremuestreo ×5) | Igual que A2, más preciso | Corrige el sub-muestreo; es lo que usa el pipeline | Más código y más pruebas | Medio |
| **A4. Imagen diferencia tras reproyección** (`reproject`) | Mapa B − A (dipolo si hay movimiento) | Muy visual | Con PSF sub-muestreada la interpolación deja residuos; λ distinta deja residuos falsos | Medio |
| **A5. Fotometría de apertura** (r = 2–3 px, fondo en anillo) | µJy por exposición | Simple; vale para comparar la **misma** λ | Requiere corrección de apertura para valores absolutos; sensible a vecinos | Bajo |
| **A6. Fotometría forzada oficial** (Spectrophotometry Tool, Tractor) | `flux`, `flux_err`, `mjd`, `flags` por exposición | Método oficial, con ePSF y flags | Solo interfaz web; no recentra: con movimiento propio hay que darle la posición de cada época | Bajo (offline) |
| A7. Detección automática de múltiples fuentes en 5 regiones | Catálogo de candidatos | Escalable | Muchos falsos positivos; fuera del MVP | Alto |

**Sugerencia del agente (no es decisión):** A2 para el movimiento (A3 si sobra tiempo), A5 o A6 para el brillo con la regla R6, y A1/A4 solo como visualización. Todo precalculado offline, que coincide con la recomendación de Johann (0001 §4.2).

## Anexo B — Lo que dicen los datos reales (verificado el 14-nov-2026)

> **[PENDIENTE DE RECALCULAR] (condición A3):** B.2 y B.3 son sondeos exploratorios, sin FLAGS aplicados, sin paralaje y sin covarianzas. Las épocas (B.1) y las magnitudes de catálogo (B.4) son datos de archivo y no cambian. Los números de B.2 y B.3 no se usan como resultado del producto ni en el pitch hasta recalcularlos con el método aprobado (plan 0011, tarea 13).

### B.1 Épocas disponibles (IRSA SIA2)

| Objeto | DR1 | QR3 | Grupos de fechas |
| --- | --- | --- | --- |
| WISE 0855 | may-25 · oct–dic-25 · abr–may-26 | 0 imágenes | 3 |
| Barnard | ago–oct-25 · mar–may-26 | ago–sep-26 | 3 |
| ε Indi B | abr–jun-25 · sep–nov-25 · abr–may-26 | sep–oct-26 | **4** |
| RW Aur | sep-25 · feb–mar-26 | sep-26 | 3 |
| R Dra | may–jul-25 · oct-25–ene-26 · abr–may-26 | may–jul-26 | **3** (la última pasada junta DR1 abr–may-26 y QR3 may–jul-26: salto de 3 días) |

La columna de la derecha usa la **regla de pasadas** de D12 §5.2 (salto > 45 d, mezclando colecciones). La primera versión de esta ficha agrupaba por colección y contó 4 en R Dra: estaba mal (triage 14-nov). Las fechas coinciden con el conteo de Johann (0001 §7.4 H). ε Indi B se resolvió sin SIMBAD (caído hoy), con 2MASS vía IRSA Gator: J2000 ≈ 331,043836°, −56,782707°.

### B.2 Sondeo de movimiento: ε Indi B (exploratorio)

12 recortes D3 reales (DR1 + QR3), todos con `FINAST=0` y `L2DQAFLG=Pass`, centroide gaussiano en marco nativo y WCS de cada imagen:

- Desplazamiento de la primera a la última: **6,45″ = 1,05 px en 1,42 años**.
- Ajuste lineal: μα* = **3,88″/año**, μδ = **−2,57″/año**; RMS de residuos 0,38″ (RA) y 0,19″ (Dec).
- Contraste 1: Hipparcos de **ε Indi A** da 3,97 / −2,54 ″/año: **consistencia con la compañera** de movimiento común, no astrometría independiente de B.
- Contraste 2: Gaia DR3 del fotocentro Ba+Bb da +3,982 / −2,467 ″/año (D12 §7). La diferencia con el sondeo (−0,10 / −0,10 ″/año) está en el rango esperable para un ajuste lineal sin paralaje, sin FLAGS y sin covarianzas; no se interpreta hasta cumplir C1–C6. Gaia no es independiente del WCS de SPHEREx.
- SNR 95–163; FWHM 1,0–1,3 px.
- Dos imágenes tenían `HALO`/`TRANSIENT` (y una `SUR_ERROR`) cerca del objetivo: R7/R8 las habrían descartado o advertido.

**Lectura:** el movimiento de ~1 px parece medible con ~0,3″ por imagen. ε Indi B queda priorizado como **candidato de movimiento** (Sebastián), no como caso evaluado: falta cumplir C1–C7 (sección 4.4). Este sondeo no aplicó FLAGS ni controló Ba/Bb.

### B.3 Sondeo de brillo: la trampa LVF con datos reales (exploratorio)

Apertura r = 2 px, fondo en anillo, conversión con `OMEGA_MEDIAN`, solo error estadístico y sin corrección de apertura. λ = `CWAVE`/`CBAND` del Spectral WCS oficial en el píxel original medido:

| Fecha | `CWAVE` (µm) | `CBAND` (µm) | Flujo (µJy) |
| --- | --- | --- | --- |
| 2025-04-29 | 1,6464 | 0,0389 | 31 891 ± 195 |
| 2025-09-28 | 1,6377 | 0,0386 | 31 157 ± 190 |
| 2026-09-25 | 1,6562 | 0,0395 | 31 726 ± 218 (`SUR_ERROR`, `HALO`: se descarta) |
| 2025-06-10 | 1,9341 | 0,0469 | 12 266 ± 121 |
| 2026-09-28 | 1,9333 | 0,0476 | 12 387 ± 120 |
| 2025-04-30 | 2,3753 | 0,0589 | 11 965 ± 124 |

- Con la **preselección R6** (Δλ/min(CBAND) ≤ 0,02) solo pasa 1,9341 vs. 1,9333 µm (0,017; 15 meses): **+1,0 %**, por debajo de 5σ → `change_below_criterion`, con `spectral_bias_unverified` (falta la pendiente espectral).
- **Discrepancia abierta:** Sebastián reprodujo ese par (0032 §4.1) con fondo en anillo de 3–5 px y obtuvo 12 340,79 ± 121,15 / 12 256,68 ± 120,01 µJy: diferencia de **signo opuesto** a la mía (fondo en anillo de 5–9 px). Ninguno de los dos sondeos aplicó máscara de vecinos ni corrección de apertura. Hay que fijar un solo método (tareas 10 y 13 del plan 0011) antes de comparar. El par 1,6464 vs. 1,6377 µm (0,22) **no** cumple R6: su −2,3 % no se interpreta (una diferencia pequeña también puede salir de efectos que se compensan).
- A **λ distinta** (1,6464 vs. 2,3753 µm, con un día de diferencia) parece haber un "−62 %". Es el espectro de la enana marrón, no un cambio temporal. **Es la mejor demostración de por qué existe la regla R6** (útil para Sebastián y para el pitch).

### B.4 Brillo de los objetos propuestos frente a la saturación (bloqueante para elegir casos)

| Objeto | Catálogo (Vega) | ≈ AB `[conversión aprox.]` | Límite SPHEREx (AB, Tabla 25) | Conclusión |
| --- | --- | --- | --- | --- |
| Barnard | 2MASS K = 4,52 | ≈ 6,4 | ≈ 11,3 (D3) | **Saturada** (~5 mag): medición poco fiable |
| RW Aur | 2MASS K = 7,02; W2 = 5,23 | ≈ 8,9; ≈ 8,6 | 11,3 (D3); 9,75 (D6) | **Saturada** |
| R Dra | 2MASS K = 2,44 | ≈ 4,3 | 11,3 | **Muy saturada** |
| ε Indi B | 2MASS K = 11,21 | ≈ 13,1 | 11,3 | **Bien**: SNR 95–163 medido |
| WISE 0855 | AllWISE W2 = 13,70 | ≈ 17,0 | 50σ a 13,17 (D6) | **Demasiado débil** en una exposición: SNR medido de −0,0 a 4,7 en D5/D6 |

Conversión Vega→AB usada: K +1,85, W2 +3,34 `[VERIFICAR fuente exacta]`.

**Consecuencias:**

- De los cinco objetos de `02-ciencia-para-cs.md`, solo ε Indi B está en rango para medir.
- Las dos variables propuestas (RW Aur, R Dra) saturan: para un caso de brillo hace falta otra variable más débil (K ≳ 12 Vega) solo como filtro de búsqueda: no garantiza ausencia de saturación ni detección; hay que revisar píxeles y banda SPHEREx usados. Queda como **opcional** (Sebastián).
- **El par candidato D3 de WISE 0855 (may-2025 / may-2026, misma λ; 0001 §7.4 B) no es medible:** WISE 0855 no se detecta en una exposición ni en D5/D6, donde más brilla, y en D3 es todavía más débil `[inferencia sobre D3]`. Sirve como ejemplo de `no_usable_detection`, no como caso de cambio. Apilar cada época podría ayudar `[VERIFICAR]`, pero es arriesgado.

## Anexo C — Alcance escalonado

| Nivel | Qué | Estado |
| --- | --- | --- |
| **Primera entrega (obligatorio)** | Movimiento de ε Indi B como **candidato**, precalculado offline, con `AnalysisResult` (`photometry: null`) y como máximo "observado" (§0) | Viable según B.2, pendiente de recalcular |
| Segunda entrega | El mismo objeto como **control de brillo**: `change_below_criterion` a λ emparejada (R6) y `not_comparable` a λ distinta (B.3) | Fuera de la primera entrega (A2) |
| Opcional | Un caso de variabilidad real (requiere una variable no saturada) | Falta candidato |
| Fuera del MVP | Detección automática de múltiples fuentes en 5 regiones; declarar objetos nuevos | No se compromete |

## Anexo D — Respuestas a las preguntas de la ficha 0001 §6.2 para Mateo

| Pregunta de Johann | Respuesta de esta ficha |
| --- | --- |
| ¿Qué medición se prioriza y sobre qué área? | Primero el desplazamiento (a), sobre el objetivo: ventana de ±4 px para el ajuste y radio de 2,5 px para revisar FLAGS (radio que usa el pipeline). El flujo (b) se usa como control a λ emparejada. Los valores finales los aprueba Sebastián |
| ¿Píxeles nativos o reproyectados? | **Nativos** para medir (sin remuestreo, sin correlación de ruido). La reproyección solo se usa para mostrar |
| ¿WCS/rejilla, FLAGS, varianza, PSF/fondo, calibraciones? | WCS espacial completa con SIP; FLAGS y VARIANCE obligatorias; `CWAVE`/`CBAND` vinculadas; fondo local en anillo (no `ZODI` para el centroide); `EPSF` solo si se elige A3 |
| ¿Cómo conserva la incertidumbre y qué obliga a "no evaluable"? | Covarianza por imagen + σ_wcs provisional contrastado con estrellas de referencia (§4.3). "No evaluable" si falta `VARIANCE`, WCS, tiempo UTC, identidad resuelta o hay < 2 adquisiciones utilizables tras R7 |
| ¿Qué IDs/revisiones incluye `AnalysisResult`? | `inputs[]` = `{observation_id, product_id}`; `region_ref` = `{region_id, revision}`; `method.version`; `provenance.code_ref` y `executed_at` |
| FLAGS comprimida: ¿recorte de IRSA o archivo completo? | **Recortes de IRSA** bastan: traen FLAGS ya descomprimida y el origen de píxel. Se usaron así en el anexo B |
| ¿`XPOSURE` o `TELAPSE`? ¿Qué tiempo? | `XPOSURE` como duración; el punto medio `MJD-AVG` (UTC) como tiempo de cada medición |

## Anexo E — Dependencias y preguntas abiertas

| Para | Pregunta |
| --- | --- |
| Johann | **Respondido (STATE 14-nov):** la λ de cada medición la lee este módulo en el píxel medido; `spectral.local` queda como punto de referencia. **Respondido:** el recorte entra como `products.derived` con `Transformation operation="cutout"` (0001 §3.5); carpeta `backend/app/analysis/` (ADR 0010). **Pendiente:** ¿quién descarga las estrellas Gaia de la tarea 9b? |
| Sebastián | **Respondido el 14-nov (provisional):** R6 = Δλ/min(CBAND) ≤ 0,02 solo para ε Indi B; R11 = SNR ≥ 5 por exposición; R12 = ≥ 5σ con covarianza; ε Indi B como candidato; Hipparcos/Gaia solo como contraste. **2.º mensaje:** R12 con Q ≥ 28,7437024269; C_WCS = diag(0,09; 0,09) arcsec²; R6 solo como preselección. Ficha 0032 en la rama `scientific-rules`. **Pendiente:** fusión de 0030–0033 en `main`; pendiente espectral para validar R6; severidad final de los códigos; umbral para `wavelength_dependent_position`; solución publicada de Ba/Bb (C7). |
| Daniel | ¿La UI necesita `zone_of_interest` en grados o en píxeles del recorte reproyectado? ¿Cómo muestra `is_synthetic`? |
| Equipo | ADR de alcance (guiado vs. libre); ¿todo precalculado offline (recomendado) o backend en vivo? |

Scripts del sondeo (solo investigación, fuera del repo): consulta SIA por épocas, cabeceras por rango de bytes, centroide/flujo de ε Indi B, `CWAVE`/`CBAND` por rango de bytes y SNR de WISE 0855. Se pueden agregar a `scripts/` si el equipo lo pide.
