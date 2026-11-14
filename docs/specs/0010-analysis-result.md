# Ficha de tarea para agente — Mediciones temporales (`AnalysisResult`)

- Dueño humano: Mateo (rango de fichas 0010–0019)
- Estado: **borrador** (Ciclo 1, documentación; no implementar todavía)
- Revisores: Sebastián (ciencia), Johann (frontera con `Observation`)
- Depende de: [0001 — Arquitectura de datos y `Observation`](0001-arquitectura-observation.md) (borrador de Johann, en `main`)
- ADRs relacionados: 0003 (stack recomendado), 0010 (stack del módulo, propuesta). Pendiente: ADR de alcance MVP (guiado vs. libre).
- **Criterios científicos:** R6, R11, R12, el modelo de incertidumbre y las condiciones del caso son los **propuestos por Sebastián** en su mensaje del 14-nov-2026, adoptados aquí como **provisionales** hasta que su ficha (`ScientificCase`) los publique. Esta ficha los citará entonces en vez de duplicarlos.

> **Etiquetas.** `[medido]` = probado con datos reales el 14-nov-2026. `[doc]` = documentación oficial. `[inferencia]` = razonamiento sin prueba directa. `[VERIFICAR]` = falta respaldo. `[DECISIÓN EQUIPO]` / `[DECISIÓN SEBASTIÁN]` = no lo decide este módulo ni un agente.
>
> **Regla del módulo:** este módulo **mide**, no **interpreta**. Devuelve números con unidades, incertidumbre, método y advertencias. Nunca dice "es un asteroide", "es Planet X" ni asigna el semáforo; eso lo hace `ScientificCase` (Sebastián).

---

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
  outcome: change_measured | change_below_criterion | no_usable_detection | not_evaluable | data_error
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
    test: {statistic: chi2, value, dof: 2, p_value, equivalent_sigma}   # Δᵀ C⁻¹ Δ; NO separation/σ
    fit_residual_rms_arcsec: number | null
    residuals_vs_wavelength: {slope_arcsec_per_um, sigma, n} | null     # control Ba/Bb (sección 4.4)
    reference_star_check: {n_stars, rms_arcsec, catalog, catalog_version} | null
    external_references:        # contraste, no evaluación automática
      - {catalog, identifier, version, epoch_jyear, pm_ra_cosdec, pm_dec, pm_uncertainties,
         parallax_mas, object_relation: same_object | common_proper_motion_companion,
         independence_note}
  photometry:                    # solo si kind = flux_change; null si no se midió
    wavelength_match: {lambda_a_um, lambda_b_um, delta_lambda_um, delta_over_min_cband, tolerance, tolerance_source}
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
| `bad_pixels_near_target` | bits de la lista "fotometría" en r ≤ 2,5 px | `block` esa medición |
| `suspect_pixels_near_target` | resto de bits de `CONTAINS_BAD_PIXEL` en r ≤ 2,5 px | `warn` |
| `saturation_risk` | objetivo más brillante que el límite de la Tabla 25, o bits `OVERFLOW`/`NONLINEAR` | `block` en flujo; `warn` en posición `[VERIFICAR]` |
| `low_snr` | SNR < 5 en esa exposición (R11) | esa exposición no se usa; si no queda ninguna → `no_usable_detection` |
| `wavelength_dependent_position` | los residuos de posición dependen de λ (sección 4.4, Ba/Bb) | `warn`; `block` si la pendiente explica el movimiento `[DECISIÓN SEBASTIÁN]` |
| `registration_unverified` | no se comprobó el registro con estrellas de referencia del recorte | `warn` (impide pedir "evaluado") |
| `uncertainty_inflated` | los residuos superan lo esperado y se infló σ_wcs (sección 4.3) | `info` |
| `target_off_footprint` | el objetivo cae fuera de la imagen o del recorte | `block` |
| `neighbor_confusion` | otra fuente a < 2 px | `warn` |
| `insufficient_epochs` | < 2 adquisiciones distintas utilizables | `block` → `not_evaluable` (mismo nombre que 0001 §4.4) |
| `insufficient_baseline` | Δt tan corto que el movimiento esperado < σ | `warn` |
| `parallax_not_modeled` | modelo lineal con objeto cercano | `info` |
| `pipeline_quality_unexpected` | `FINAST` ≠ 0 o `L2DQAFLG` ≠ `Pass` (no debería ocurrir en lo publicado) | `block` |
| `synthetic_data` | `is_synthetic = true` | `info` (la UI lo muestra siempre) |

**Ejemplo con datos reales (sondeo exploratorio, no es un resultado del producto):** las 12 mediciones de ε Indi B del anexo B son las filas que llenarían `measurements` y `astrometry`.

**Lo que este contrato NO contiene, a propósito:** nivel del semáforo, texto para el público, "tipo de objeto". Sebastián los deriva de `outcome`, `comparability`, `issues`, `test` y `significance_sigma` en `ScientificCase`. Las referencias externas (Hipparcos/Gaia) son contraste y nunca otorgan solas el nivel "evaluado"; "confirmado" nunca lo asigna la app.

## 4. Restricciones científicas (precondiciones de comparación)

> R6, R11 y R12 llevan los valores **propuestos por Sebastián** (mensaje del 14-nov-2026), provisionales para el MVP. No son garantías ni tolerancias universales.

### 4.1 Reglas

| # | Regla | Tarea | Si falla | Fuente |
| --- | --- | --- | --- | --- |
| R1 | ≥ 2 **adquisiciones** distintas (`acquisition_id` y tiempo distintos; no cuentan detectores ni versiones de la misma) | a, b | `not_evaluable` (`insufficient_epochs`) | onboarding §2.5; 0001 §4.1 |
| R2 | El objetivo cae dentro de cada imagen o recorte | a, b | descartar esa imagen | — |
| R3 | Guarda defensiva: `FINAST == 0` y `L2DQAFLG == 'Pass'` | a, b | `pipeline_quality_unexpected` | Expsupp §3.2.8; IRSA solo publica imágenes así (0001 §7.4 E), así que **no discrimina** entre productos |
| R4 | Identidad resuelta y calibración vinculada | a, b (calibración solo en b) | `identity_unresolved` / `calibration_unresolved` | 0001 §3.1 y §3.5 |
| R5 | Mezclar DR1 y QR3 está permitido: mismo pipeline `v27` y las mismas 15 calibraciones [medido por Johann]. QR2 no aparece en la búsqueda actual | a, b | — | 0001 §7.4 C; Expsupp §2.1 |
| R6 | λ compatible en la posición medida de cada época: **Δλ / min(CBAND₁, CBAND₂) ≤ 0,02**, con `CWAVE`/`CBAND`. Válido **solo** para el control de brillo de ε Indi B; otro objeto necesita su propio criterio (depende del espectro y de la respuesta de ambas bandas) | b | `not_comparable` (`wavelength_mismatch`). Fuera del criterio, la diferencia **no** se interpreta como variabilidad | Sebastián (14-nov) + trampa LVF [doc] + anexo B.3 [medido] |
| R7 | Sin bits de la lista "fotometría" en r ≤ 2,5 px: `SUR_ERROR, NONFUNC, MISSING_DATA, HOT, COLD, NONLINEAR, PERSIST, BLOOM, SNOWBALL, HALO, SATELLITE_HALO` | a, b | descartar esa medición | Expsupp §3.3 "Flag usage" |
| R8 | Resto de la lista `CONTAINS_BAD_PIXEL` (`TRANSIENT, OVERFLOW, DICHROIC, CROSSTALK, GHOST*, STREAK`) → advertir, no bloquear | a, b | `warn` | Expsupp §3.3: "should only be interpreted as a warning" |
| R9 | **`SOURCE` no es un problema**: marca píxeles de fuentes conocidas (51 % del detector en una imagen de prueba) | a, b | — | Expsupp Tabla 16 + `PXSRCMSK=51.16` [medido] |
| R10 | Objetivo no saturado: más débil que ~11,3–11,7 AB (D1–D4), 10,2 AB (D5), 9,75 AB (D6) | b (a: advertir) | `not_comparable` | Expsupp Tabla 25 (modelo pre-lanzamiento de no linealidad) |
| R11 | Detección utilizable: **SNR ≥ 5 por exposición usada**, además de calidad (R7), identificación y ajuste aceptables. Política del MVP, no garantía de detección | a, b | esa exposición no se usa; sin ninguna → `no_usable_detection`, conservando flujo, incertidumbre y límite superior. Nunca flujo cero ni "desapareció" | Sebastián (14-nov) |
| R12 | Solo `change_measured` si el cambio es **≥ 5σ**. En posición: prueba χ² en 2D con la covarianza de la diferencia (`test.equivalent_sigma`), no separation/σ. En flujo: \|Δ\|/σ_Δ propagando ambas épocas | a, b | `change_below_criterion`: se conserva la medición; no se afirma que el objeto sea inmóvil o constante | Sebastián (14-nov) |

### 4.2 Cosas que **no** se deben asumir

- Mismo detector ≠ misma λ. Medido: en D3, ε Indi B cayó entre 1,638 y 2,375 µm según la imagen (anexo B); Johann vio lo mismo en WISE 0855 (0001 §7.4 B).
- Fecha de publicación (`time.release_date`) y fecha de procesamiento ≠ fecha de adquisición.
- Colores reescalados para la pantalla no son flujo. El flujo se mide en MJy/sr → µJy, nunca sobre el PNG.
- Una "época" dura semanas (anexo B.1). Un objeto rápido se mueve **dentro** de ella: se usa el tiempo de cada exposición.
- `WCS-WAVE` es aproximada (0001 §3.5). En las 12 imágenes de ε Indi B difiere de `CWAVE` solo entre +0,15 y +0,75 nm [medido], pero cerca del borde llega a 0,52 µm (0001 §7.4 D). Para decidir comparabilidad se usa `CWAVE`.

### 4.3 Modelo de incertidumbre (provisional, revisado con Sebastián)

- **Posición, por imagen:** covarianza `C = C_stat + σ_wcs²·I`, con `σ_wcs = 0,3″` **provisional**. Ese 0,3″ es el **rendimiento RMS observado** contra Gaia (Expsupp §4.2.2), **no** un piso obligatorio universal. Se contrasta con estrellas de referencia del mismo recorte (`reference_star_check`); si sus residuos son mayores, se infla `σ_wcs` y se marca `uncertainty_inflated`. Motivo [medido]: el error estadístico del ajuste salió ~0,02″, pero la dispersión real entre imágenes fue de 0,2–0,4″.
- **Diferencia de posición:** `C_Δ = C_A + C_B` (más correlaciones si las hay; por ejemplo, dos detectores de la misma adquisición comparten apuntado). Estadístico `Δᵀ C_Δ⁻¹ Δ` ~ χ² con 2 grados de libertad, reportado también como σ gaussiana equivalente.
- **Ajuste lineal:** con N fechas, la covarianza del movimiento sale del ajuste ponderado; si χ²/dof > 1, se escala.
- **Flujo:** `σ_total = √(σ_stat² + (0,03·F)²)`. El 3 % **sí** está documentado como término añadido a la incertidumbre fotométrica oficial (Expsupp §3.3, ec. 19).
- La significancia se reporta siempre, incluso por debajo de 5σ.

### 4.4 Condiciones antes de evaluar el candidato ε Indi B (Sebastián, 14-nov)

| # | Condición | Cómo se cumple | Estado |
| --- | --- | --- | --- |
| C1 | Recalcular aplicando FLAGS (R7/R8) | Excluir las exposiciones con `SUR_ERROR`/`HALO` cerca del objetivo (anexo B.2 tiene dos) | Pendiente |
| C2 | Documentar archivos y fechas exactos | Lista de `product_id`, URL, versión y `MJD-AVG` de cada recorte en el manifiesto (`contracts/package-manifest.schema.json`) | Pendiente |
| C3 | Comprobar el registro con estrellas de referencia | Estrellas Gaia del recorte, no saturadas y aisladas: RMS de sus residuos por imagen | Pendiente |
| C4 | Revisar paralaje | ε Indi B está a ~3,6 pc (paralaje ≈ 0,27″ `[VERIFICAR]`): modelar o al menos cuantificar su efecto en las fechas usadas | Pendiente |
| C5 | Revisar sesgo del centroide | PSF sub-muestreada (FWHM ≈ 1,2 px): pruebas sintéticas con fase de píxel variable (plan 0011) o ajuste con ePSF | Pendiente |
| C6 | **Ba/Bb no resueltas** | SPHEREx no separa las dos enanas: a distinta λ cambia el peso de cada una y el centro de luz puede moverse. Probar si los residuos de posición dependen de λ (`residuals_vs_wavelength`) y, si hace falta, usar solo λ parecidas | Pendiente |
| C7 | Referencia externa adecuada | Buscar una solución astrométrica publicada de Ba/Bb (movimiento, paralaje y órbita). Gaia no es del todo independiente: el WCS de SPHEREx ya usa ese marco | Pendiente |

## 5. Casos de prueba

Las pruebas **sintéticas** son para el código y van rotuladas (`is_synthetic: true`). Las pruebas con **datos reales** son para la ciencia y el pitch. Nunca se mezclan.

| # | Tipo | Caso | Resultado esperado |
| --- | --- | --- | --- |
| T1 | sintético | Dos imágenes idénticas (misma matriz, mismo WCS) | `change_below_criterion`, separación 0 dentro de σ |
| T2 | sintético | Misma escena con WCS desplazado globalmente, objeto quieto | separación ≈ 0 en el cielo. Si se midiera en píxeles fallaría (prueba de regresión) |
| T3 | sintético | Fuente gaussiana desplazada 1,0 px conocido, ruido conocido | `change_measured`, separación ≈ 6,15″ ± σ; el valor inyectado queda dentro de 2σ `[VERIFICAR criterio]` |
| T4 | sintético | Misma fuente, flujo ×1,5 en B, misma λ | `flux_change`, ratio ≈ 1,5 ± σ |
| T5 | sintético | B con escala/exposición distinta pero flujo físico igual | ratio ≈ 1 (no se compara "brillo de pantalla") |
| T6 | sintético | Píxel `HOT` o `NONLINEAR` sobre el objetivo en B | medición B descartada (`bad_pixels_near_target`); `not_evaluable` si quedan < 2 |
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

### B.1 Épocas disponibles (IRSA SIA2)

| Objeto | DR1 | QR3 | Grupos de fechas |
| --- | --- | --- | --- |
| WISE 0855 | may-25 · oct–dic-25 · abr–may-26 | 0 imágenes | 3 |
| Barnard | ago–oct-25 · mar–may-26 | ago–sep-26 | 3 |
| ε Indi B | abr–jun-25 · sep–nov-25 · abr–may-26 | sep–oct-26 | **4** |
| RW Aur | sep-25 · feb–mar-26 | sep-26 | 3 |
| R Dra | may–jul-25 · oct-25–ene-26 · abr–may-26 | may–jul-26 | 4 |

Coincide con el conteo independiente de Johann (0001 §7.4 H) para los objetos que ambos consultamos. ε Indi B se resolvió sin SIMBAD (caído hoy), con 2MASS vía IRSA Gator: J2000 ≈ 331,043836°, −56,782707°.

### B.2 Sondeo de movimiento: ε Indi B (exploratorio)

12 recortes D3 reales (DR1 + QR3), todos con `FINAST=0` y `L2DQAFLG=Pass`, centroide gaussiano en marco nativo y WCS de cada imagen:

- Desplazamiento de la primera a la última: **6,45″ = 1,05 px en 1,42 años**.
- Ajuste lineal: μα* = **3,88″/año**, μδ = **−2,57″/año**; RMS de residuos 0,38″ (RA) y 0,19″ (Dec).
- Contraste: el movimiento de Hipparcos de **ε Indi A** es 3,97 / −2,54 ″/año. Como A es la compañera de movimiento común, esto muestra **consistencia con la compañera**, no una astrometría independiente de B. Falta una solución publicada de Ba/Bb (C7).
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

- Con el **criterio R6** (Δλ/min(CBAND) ≤ 0,02) solo pasa 1,9341 vs. 1,9333 µm (0,017; 15 meses): **+1,0 %**, por debajo de 5σ → `change_below_criterion`. El par 1,6464 vs. 1,6377 µm (0,22) **no** cumple R6: su −2,3 % no se interpreta (una diferencia pequeña también puede salir de efectos que se compensan).
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
| **Obligatorio** | 1 caso real guiado de movimiento con medición defendible (candidato técnico: ε Indi B), precalculado offline, con `AnalysisResult` completo | Viable según B.2 |
| Recomendado | El mismo objeto como **control de brillo**: `change_below_criterion` a λ emparejada (R6) y `not_comparable` a λ distinta (B.3) | Viable según B.3 |
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
| Johann | **Respondido (STATE 14-nov):** la λ de cada medición la lee este módulo en el píxel medido; `spectral.local` queda como punto de referencia. **Pendiente:** ¿el recorte entra como `products.derived` con su `Transformation`? ¿Carpeta del módulo (ADR 0010)? |
| Sebastián | **Respondido el 14-nov (provisional):** R6 = Δλ/min(CBAND) ≤ 0,02 solo para ε Indi B; R11 = SNR ≥ 5 por exposición; R12 = ≥ 5σ con covarianza; ε Indi B como candidato; Hipparcos/Gaia solo como contraste. **Pendiente:** que su ficha publique estos criterios; severidad final de los códigos; umbral para `wavelength_dependent_position`; solución publicada de Ba/Bb (C7). |
| Daniel | ¿La UI necesita `zone_of_interest` en grados o en píxeles del recorte reproyectado? ¿Cómo muestra `is_synthetic`? |
| Equipo | ADR de alcance (guiado vs. libre); ¿todo precalculado offline (recomendado) o backend en vivo? |

Scripts del sondeo (solo investigación, fuera del repo): consulta SIA por épocas, cabeceras por rango de bytes, centroide/flujo de ε Indi B, `CWAVE`/`CBAND` por rango de bytes y SNR de WISE 0855. Se pueden agregar a `scripts/` si el equipo lo pide.
