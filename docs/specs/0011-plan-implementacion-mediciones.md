# Plan de implementación — módulo de mediciones (`AnalysisResult`)

- Dueño humano: Mateo
- Estado: **borrador (revisión 2)**. Es un plan y no autoriza a programar: se ejecuta solo cuando la ficha [0010](0010-analysis-result.md) esté **aprobada** (`AGENTS.md` §4.1).
- Base: ficha 0010 (qué hacer), ficha [0001](0001-arquitectura-observation.md) (entradas), ADR [0010](../adr/0010-stack-modulo-mediciones.md) (stack), ADR [0041](../adr/0041-arquitectura-y-patrones.md) (hexagonal), [D12](../context/12-mapa-de-datos-spherex.md) (reglas de datos), ficha 0032 de Sebastián (rama `scientific-rules`, criterios cuantitativos).
- Método: TDD (`AGENTS.md` §6): primero la prueba en rojo, después el código mínimo, después limpiar. Tareas de 2–15 min.
- Revisión 2 (14-nov, noche): reorganizado sobre el backend real (`backend/src/skyshift`, PR #6) y corregido según la revisión de Johann y el 2.º mensaje de Sebastián.
- Revisión 3 (14-nov, 19:30): **primera entrega = solo movimiento de ε Indi B como candidato** (ficha 0010 §0, condiciones A1–A6 de Sebastián). La prueba χ² y la diferencia con covarianza se **reutilizan** de `science/validation.py` (Sebastián), no se reimplementan. Dax aprobó la integración en el backend y las dependencias; Dax, Daniel y Johann aprobaron entregar el resultado como JSON estático en `frontend/public/demo/`.
- **Implementación de la primera entrega (14-nov, 19:50, rama `feat/measurement-motion`)** y desviaciones respecto del plan:
  - Tarea 5 (recorte → píxel original) **no hace falta**: `FrameReader` ya lee recuadros en píxeles originales del detector.
  - Tarea 1: en vez de comparar pydantic con el esquema, el serializador (`api/analysis_json.py`) se valida **contra el esquema escrito a mano** con `jsonschema` en los tests y en `mise run check-contracts`. Mismo objetivo (el código obedece al contrato), con una dependencia menos.
  - Tarea 0: solo se agregó `scipy` (ya venía en el lockfile vía `reproject`); `photutils` queda para la 2.ª entrega (A3, ePSF). `jsonschema` se agregó solo como dependencia de desarrollo.
  - Tarea 9: `astrometric_p_value` y `compare_significance` de Sebastián se movieron **sin cambios** a `backend/src/skyshift/domain/significance.py`. Cuando el PR #9 entre, `science/validation.py` debe importarlas desde ahí.
  - Tarea 9b (estrellas Gaia) **pendiente**: el resultado lleva `registration_unverified`.
  - Con p redondeada a 0 (Q > ~1490), la decisión compara Q con el umbral calculado (regla equivalente).

## 1. Arquitectura: dentro del backend hexagonal existente

El backend ya resuelve parte del trabajo. Se **reutiliza** y no se duplica (ADR 0041: `domain ← application ← adapters/api`).

| Necesidad | Ya existe (no reescribir) | Se agrega |
| --- | --- | --- |
| Píxeles IMAGE/FLAGS/VARIANCE por rango desde S3 | `application/frame_reader.py` | — |
| Pasadas (> 45 d) | `domain/visits.py` | — |
| Máscara de comparación `0x3FD2CEC7` y `OUTLIER` | `domain/flags.py` | — |
| Movimiento propio + paralaje | `domain/motion.py` | — |
| Selección de λ para la serie (λ/(4R), WCS-WAVE) | `domain/wavelength.py` | — |
| Semáforo OBSERVED/EVALUATED | `domain/comparability.py` | — |
| Prueba χ² 2D y diferencia con covarianza | `science/validation.py` de Sebastián (`astrometric_p_value`, `flux_difference`, PR #9) | **Nada propio:** se reutiliza. Sebastián y Johann deciden su lugar final en `domain/`; este módulo solo lo llama |
| Medición en marco nativo y covarianza por imagen | — | `domain/measurement/astrometry.py` |
| Fotometría de apertura y límites superiores | — | `domain/measurement/photometry.py` |
| Reglas de la ficha 0010 → `checks` + `issues` | — | `domain/measurement/rules.py` |
| `CWAVE`/`CBAND` en el píxel medido | — | puerto `ports/spectral_calibration.py` + adaptador S3 por rango (como `s3_archive.py`) |
| Estrellas Gaia para el registro (tarea 9b) | — | puerto `ports/reference_stars.py` + adaptador IRSA `gaia_dr3_source` (consulta de cono por HTTP, como en D12 §7 y 0032 §4.1); sin `pyvo`, con el cliente `http.py` existente |
| Caso de uso | — | `application/measure_target.py` |
| Precálculo offline del candidato | — | `application/precompute_measurement.py` + tarea `mise` |
| Ruta HTTP | **No** en este plan | Solo si se agrega `AnalysisResult` a `contracts/openapi.yaml` primero |

**Regla de configuración:** `AnalysisConfig` exige `wavelength_preselection_over_min_cband`, `min_snr_per_exposure`, `min_significance_sigma_two_sided`, `c_wcs_arcsec2_provisional` y `flux_sys_fraction`, cada uno con su fuente (`source`). Si falta uno, el código falla al arrancar; nunca inventa un valor. Las pruebas usan `TEST_CONFIG`, rotulado como de prueba.

**Configuración del candidato ε Indi B** (archivo versionado; `criteria_ref` = "Sebastián, mensajes del 14-nov-2026 + ficha 0032, provisional"):

| Clave | Valor | Fuente |
| --- | --- | --- |
| `wavelength_preselection_over_min_cband` | 0,02, solo como **preselección** del control de brillo de ε Indi B; no valida el sesgo espectral | Sebastián (2.º mensaje) |
| `min_snr_per_exposure` | 5 | Sebastián |
| `min_significance_sigma_two_sided` | 5 → el código **calcula** `p = 2·(1 − Φ(5)) = 5,7330314376 × 10⁻⁷` y `Q = −2 ln p = 28,7437024269` | Sebastián (2.º mensaje), 0032 §3.3 |
| `c_wcs_arcsec2_provisional` | `diag(0,09; 0,09)` (0,3″ por eje, sin dividir entre √2), inflable según estrellas de referencia | Expsupp §4.2.2 fig. 20 + Sebastián |
| `flux_sys_fraction` | 0,03, una vez por medición `[VERIFICAR para apertura]` | Expsupp §3.3 nota 1; 0032 §2 |

## 2. Tareas (orden de ejecución)

Cada tarea dice qué prueba escribir primero y cuándo está terminada.

| # | Tarea | Prueba primero (rojo) | Terminada cuando | Ficha 0010 |
| --- | --- | --- | --- | --- |
| 0 | Dependencias y esqueleto: agregar `scipy` y `photutils` al `pyproject` del backend (ADR 0010) y crear `domain/measurement/` | `test_architecture.py` sigue pasando: `domain/measurement` no importa adaptadores | `uv run pytest`, `ruff` y `pyright --strict` pasan en Windows **y** Fedora | ADR 0010 |
| 1 | **Contrato primero:** escribir a mano `contracts/analysis-result.schema.json` (estilo de `observation.schema.json`) y un ejemplo sintético; después los modelos pydantic | `mise run check-contracts` valida el ejemplo; un JSON sin `inputs`, con 1 entrada o con `outcome` desconocido falla; **prueba de paridad:** el JSON Schema que exporta pydantic coincide con el escrito a mano | Todos los enums de 0010 §3 presentes | §3 |
| 2 | Configuración sin valores por defecto | Construir `AnalysisConfig` sin `min_snr_per_exposure` lanza error | Cada umbral lleva `value` + `source` | §4 |
| 3 | Generador sintético (sección 3) | Una fuente inyectada en (ra, dec) cae en el píxel esperado según el WCS | Genera IMAGE, VARIANCE, FLAGS, cabecera con WCS y `CRPIXnA`; marca `is_synthetic` | §5 |
| 4 | Política de FLAGS: **reutilizar** `domain/flags.py` en un radio de 2,5 px | T6: `HOT`, `OVERFLOW` y `GHOST` bloquean; `OUTLIER` solo marca; `SOURCE` nunca bloquea | `bad_pixels_near_target` / `outlier_near_target` con `paths` | R7–R9 |
| 5 | Píxel de recorte → píxel original | T9: `CRPIX1A = −375` → x_orig = x + 376 | Coincide con 0001 §7.4 I | T9 |
| 6 | WCS alternas sin SIP | Con SIP en la cabecera, la WCS `A` devuelve el píxel exacto (error < 0,01 px) | La WCS principal conserva la SIP | §2.1 |
| 7 *(2.ª entrega)* | λ en el píxel medido (`CWAVE`/`CBAND`) vía el puerto nuevo | Lector falso → valores del píxel pedido; píxel fuera de rango → error; T7 | `wavelength_method = cwave_cband` | R6, T7, T9 |
| 8 | Centroide en marco nativo | T1 (idénticas), T2 (WCS desplazado), T3 (fuente movida 1,0 px) | Error < 0,05 px en T3 sin ruido `[VERIFICAR]`; σ_stat > 0 con ruido | §1, A2 |
| 9 | Covarianza de la diferencia y llamada a la prueba χ² **de Sebastián** | T13: armar `C_Δ = C_A + C_B − C_AB − C_ABᵀ` (o `C_A + C_B` con `covariance_assumption = independent_epochs`) y pasarla a `astrometric_p_value`; comprobar que el umbral derivado de 5σ bilateral es 28,7437024269 (no 28,7, ni 25, ni √Q). Si a esta hora el PR #9 no está integrado, Sebastián y Johann suben **solo esa función** a `domain/` en un PR mínimo: este módulo no la copia | Con N fechas, la prueba se aplica al **vector de movimiento** con su covarianza; `change_measured` solo si se cumplen los supuestos A4 de 0010 §0, y aun así el nivel máximo es "observado" (A1) | §0, §4.3, R12 |
| 9b | Registro con estrellas de referencia (Gaia vía puerto `reference_stars`) | T15: residuos de 0,6″ → `C_WCS` inflado + `uncertainty_inflated`; sin estrellas → `registration_unverified` | Estrellas Gaia propagadas a la fecha, no saturadas y aisladas | §4.4 C3 |
| 9c | Residuos de posición contra λ (Ba/Bb) | T14: dos fuentes no resueltas cuya razón de flujo cambia con λ → `wavelength_dependent_position` | Reporta `residuals_vs_wavelength` | §4.4 C6 |
| 10 *(2.ª entrega)* | Fotometría de apertura | T4, T5; T8 (SNR < 5 → límite superior, nunca 0) | MJy/sr → µJy con `OMEGA`; 3 % una vez; fondo **fijo y documentado** (resolver la discrepancia con 0032 §4.1, que usó un anillo de 3–5 px frente a mi 5–9 px) | §4.3, R11, B.3 |
| 11 | Reglas de comparabilidad | T6, T8, T10, T11, T12; R1 con `domain/visits.py`. *(2.ª entrega: T7 y R6)* | Cada fallo produce `check` + `issue` con `code`, `paths`, `detail` | §4.1 |
| 12 | Ensamblado y `outcome` | Tabla de verdad: checks + `test.equivalent_sigma_two_sided` (≥ 5, calculado) → `change_measured` / `change_below_criterion` / `no_usable_detection` | El JSON valida con `contracts/analysis-result.schema.json` vía `mise run check-contracts` | §3 |
| 13 | Precálculo del candidato ε Indi B | **R-1** (movimiento) con `photometry: null`. R-2 y R-3 pasan a la 2.ª entrega (A2). Los números del anexo B se **recalculan** aquí (A3); la prueba compara con Gaia dentro de σ, no con el sondeo | Cumple C1–C5 de 0010 §4.4; posición esperada con `domain/motion.py` (Gaia DR3, con paralaje); escribe `data/derived/` y un manifiesto válido contra `contracts/package-manifest.schema.json` | B.2, B.3, §4.4 |

**Dependencias entre tareas (corregido tras la revisión de Johann):** la 7 va **antes** de la 11, porque R6 y T7 necesitan la λ. La 10 va antes de la parte de brillo de la 11 y de R-2/R-3 en la 13.

**Primera entrega (antes de las 02:00):** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9 → 9b → 11 (sin R6) → 12 → 13 (solo R-1) → JSON en `frontend/public/demo/`. **Segunda entrega (después):** 9c (Ba/Bb), 7, 10 y todo lo de brillo.

| Bloque | Tareas | Ventana objetivo (sábado, UTC−5) |
| --- | --- | --- |
| Contrato y base | 0, 1, 2 | 20:00–21:00 |
| Sintético y píxeles | 3, 4, 5, 6 | 21:00–22:15 |
| Medición | 8, 9 | 22:15–23:30 |
| Registro con Gaia | 9b | 23:30–00:15 (si se atrasa: `registration_unverified`) |
| Reglas, ensamblado y caso real | 11, 12, 13 | 00:15–01:30 |
| Evidencia y PR | tests, `ruff`, `pyright --strict`, revisión de Sebastián | 01:30–02:00 |

**Corte por tiempo:** si a la 01:30 falta la tarea 13, no se publica ningún número real: la demo muestra la serie existente sin medición, y el método se presenta en el pitch con las pruebas sintéticas (rotuladas). En la primera entrega el resultado **nunca** pasa de "observado" (A1); sin 9c, además lleva `wavelength_dependent_position` como no evaluado.

## 3. Diseño de las pruebas sintéticas

Todas usan un generador con semilla fija. Todo lo generado lleva `is_synthetic = true` y nunca se mezcla con datos reales.

**Escena base** (parecida a un recorte real de SPHEREx, 0010 anexo B):

| Parámetro | Valor | Por qué |
| --- | --- | --- |
| Tamaño | 21 × 21 px | Como un recorte de 0,02° (≈ 12 px) con margen |
| Escala | 6,15″/px, proyección TAN (sin SIP), salvo en la tarea 6 | Escala real de SPHEREx |
| PSF | Gaussiana circular, FWHM 1,2 px | FWHM medida 1,0–1,3 px |
| Flujo de la fuente | Pico de 1000 en unidades de MJy/sr | SNR ≈ 100–160, como ε Indi B |
| Ruido | Gaussiano, VARIANCE constante conocida; sin ruido en las pruebas exactas | Separar el error del método del error del ruido |
| FLAGS | Cero, salvo lo que pida cada prueba; cabecera con `MSKNnnnn`/`MSKMnnnn` como la real | Probar la lectura por nombre |
| `OMEGA_MEDIAN` | 37,86 arcsec² | Valor real de la cabecera |
| `CRPIX1A`, `CRPIX2A` | −375, −147 | Valores reales de un recorte (0001 §7.4 I) |

**Casos:**

| # | Construcción | Esperado |
| --- | --- | --- |
| T1 | A y B idénticas | separación = 0 (± 1e-6″ sin ruido); `change_below_criterion` |
| T2 | B con `CRVAL` desplazado 2 px y la fuente desplazada igual en píxeles (misma posición en el cielo) | separación en el cielo ≈ 0; en píxeles ≈ 2 px (prueba de que se mide en el cielo) |
| T3 | Fuente en B desplazada (+1,0; 0) px, mismo WCS | separación = 6,15″ ± tolerancia; `change_measured` si Q ≥ 28,7437024269 con `TEST_CONFIG` |
| T4 | Flujo de B ×1,5; misma λ | ratio = 1,5 ± σ |
| T5 | B con unidades escaladas (valores ×2 y `BUNIT` coherente) y mismo flujo físico | ratio = 1,0 ± σ |
| T6 | `HOT`, `OVERFLOW` o `GHOST` sobre el centro en B; aparte, `OUTLIER` | los tres primeros: B descartada (`bad_pixels_near_target`); `OUTLIER`: `outlier_near_target` |
| T7 | Lector de `CWAVE` falso: A = 1,65 µm, B = 2,38 µm | `flux_change` → `not_comparable` (`wavelength_mismatch`) |
| T8 | Pico al nivel del ruido (SNR < 5) | `no_usable_detection` (`low_snr`), con flujo, σ y límite superior |
| T9 | Recorte con `CRPIX1A = −375`; el lector de `CWAVE` devuelve λ distinta según x | Se lee el píxel x + 376; con un origen equivocado, la prueba falla |
| T10 | Sin muestra de tiempo UTC o sin VARIANCE | `data_error` / `not_evaluable` con `paths` |
| T11 | Dos imágenes de la **misma pasada** (separadas 10 días) | `insufficient_epochs` |
| T12 | Una entrada con `identity_status = unresolved` | `identity_unresolved` |
| T13 | Errores RA/Dec correlacionados (coeficiente 0,8), con y sin `C_AB`; Δ en la dirección "barata" | Q a mano coincide; separation/σ y √Q darían otra significancia |
| T14 | Dos gaussianas a 0,4 px; razón de flujo 1:1 a λ₁ y 1:3 a λ₂, sin movimiento | el centroide se desplaza con λ → `wavelength_dependent_position` |
| T15 | Cinco estrellas de referencia con residuos de 0,6″ | `C_WCS` efectivo ≈ diag(0,36; 0,36) y `uncertainty_inflated` |

**Pruebas de propiedad** (con `hypothesis`, que el backend ya usa): para desplazamientos aleatorios de −2 a +2 px sin ruido, el centroide recupera el valor inyectado (tolerancia `[VERIFICAR]` tras la tarea 8).

## 4. Datos reales (tarea 13)

- Los recortes de ε Indi B se leen con `FrameReader` desde S3 y se guardan fuera de Git (`data/raw/`), con URL, versión y checksum en el manifiesto (`contracts/package-manifest.schema.json`).
- Regresión **después de aplicar `COMPARE_MASK`** (C1): el movimiento se recalcula y puede cambiar respecto del sondeo (3,88; −2,57)″/año.
- Contraste externo: Gaia DR3 6412596012146801152 (fotocentro Ba+Bb, J2016,0, con paralaje; D12 §7). Se guarda con identificador, versión, época e incertidumbres. No es independiente del WCS de SPHEREx.
- R-2 debe dar `change_below_criterion` con `spectral_bias_unverified`; R-3, `not_comparable`. Ambas solo si la tarea 10 existe.
- En CI se salta si no están los archivos (marcador `slow`). Nunca se reemplaza por datos sintéticos.

## 5. Qué queda abierto

| Tema | Quién lo libera | Afecta a tareas | Estado |
| --- | --- | --- | --- |
| Aprobación de la ficha 0010 | Sebastián + Johann | todas | Pendiente: **no se programa antes** |
| Umbrales R11, R12, `C_WCS` | Sebastián | 2, 9, 11, 12 | Aceptados para la primera entrega con los supuestos A4–A5; R6 pasa a la 2.ª entrega |
| Lugar final de `astrometric_p_value` / `flux_difference` en `domain/` | Sebastián + Johann | 9 | Pendiente (A6); este módulo no los duplica |
| Dos criterios de λ (λ/(4R) en la serie frente a 0,02 × CBAND en brillo) | Sebastián + Dax | 7, 11 | Confirmar que es intencional (0010 §4.2) |
| Pendiente espectral para validar R6 | Sebastián | 11, 13 | Sin medir: R6 queda como preselección |
| Método de fondo de la fotometría (3–5 px frente a 5–9 px) | Mateo + Sebastián | 10 | Pendiente |
| Adaptador Gaia: ¿este módulo o el de Johann? | Johann + Mateo | 9b | Propuesta: puerto propio con el cliente HTTP existente |
| `AnalysisResult` en `contracts/openapi.yaml` | Johann + Dax | ruta HTTP (fuera de este plan) | No se expone por API todavía |
| Carpeta y dependencias (scipy, photutils) | Johann + Dax | 0 | **Aprobado** por Dax y Johann (14-nov): `backend/src/skyshift/` |
| Cómo llega a la UI | Daniel + Johann + Dax | 13 | **Aprobado** (14-nov): JSON estático en `frontend/public/demo/` |
| Formato del manifiesto | Johann | 13 | Resuelto: `contracts/package-manifest.schema.json` |
