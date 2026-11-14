# Plan de implementación — módulo de mediciones (`AnalysisResult`)

- Dueño humano: Mateo
- Estado: **borrador**. Es un plan, no autoriza a programar. Se ejecuta solo cuando la ficha [0010](0010-analysis-result.md) esté **aprobada** (`AGENTS.md` §4.1).
- Base: ficha 0010 (qué hacer), ficha [0001](0001-arquitectura-observation.md) (entradas), ADR [0010](../adr/0010-stack-modulo-mediciones.md) (stack).
- Método: TDD (`AGENTS.md` §6): primero la prueba en rojo, después el código mínimo, después limpiar. Tareas de 2–15 min.

## 1. Arquitectura del módulo

Funciones puras: entran matrices y cabeceras ya cargadas y sale un `AnalysisResult`. Sin red ni disco, salvo en el precálculo (tarea 12).

```
analysis/                       # dentro de backend/app/ o proyecto propio (ADR 0010)
  contract.py      # modelos pydantic de AnalysisResult (ficha 0010 §3)
  config.py        # AnalysisConfig: umbrales SIN valores por defecto
  flags.py         # bits desde la cabecera FLAGS (MSKNnnnn/MSKMnnnn), máscaras R7/R8
  pixels.py        # recorte <-> píxel original (CRPIXnA), WCS sin SIP en A/W
  wavelength.py    # CWAVE/CBAND en un píxel original (lector inyectado)
  astrometry.py    # centroide en marco nativo -> RA/Dec + sigma
  photometry.py    # apertura, fondo en anillo, MJy/sr -> uJy con OMEGA
  checks.py        # reglas R1–R12 -> checks[] + issues[]
  assemble.py      # mediciones + checks -> outcome + AnalysisResult
  precompute.py    # caso guiado con datos reales (única parte con red)
tests/analysis/
  synthetic.py     # generador de imágenes sintéticas (sección 3)
  test_*.py
```

**Regla de configuración:** `AnalysisConfig` exige `wavelength_tolerance_over_cband`, `min_snr`, `min_significance`, `sigma_wcs_arcsec` y `flux_sys_fraction`, cada uno con su fuente (`source`). Si falta uno, el código falla al arrancar; nunca inventa un valor. Las pruebas usan `TEST_CONFIG`, rotulado como de prueba.

## 2. Tareas (orden de ejecución)

Cada tarea dice qué prueba escribir primero y cuándo está terminada.

| # | Tarea | Prueba primero (rojo) | Terminada cuando | Ficha 0010 |
| --- | --- | --- | --- | --- |
| 0 | Esqueleto: proyecto `uv` con las versiones del ADR 0010, `ruff`, `pytest`, tareas `mise` `test` y `lint` | `test_smoke`: importa el paquete | `mise run test` y `mise run lint` pasan en Windows **y** en Fedora | ADR 0010 |
| 1 | Contrato: modelos pydantic de `AnalysisResult` | Un JSON válido pasa; uno sin `inputs`, con 1 entrada o con `kind` desconocido falla | Exporta JSON Schema; todos los enums de §3 presentes | §3 |
| 2 | Configuración sin valores por defecto | Construir `AnalysisConfig` sin `min_snr` lanza error | Cada umbral lleva `value` + `source` | §4 |
| 3 | Generador sintético (sección 3) | Una fuente inyectada en (ra, dec) cae en el píxel esperado según el WCS | Genera IMAGE, VARIANCE, FLAGS, cabecera con WCS y `CRPIXnA`; marca `is_synthetic` | §5 |
| 4 | Política de FLAGS desde la cabecera | Leer `MSKN0021='SOURCE'` → bit 21; `SOURCE` no bloquea; `HOT` sí; `TRANSIENT` advierte | Máscaras R7/R8 construidas por nombre, no por números fijos | R7–R9 |
| 5 | Píxel de recorte → píxel original | `CRPIX1A = -375` → x_orig = x + 376 | Coincide con 0001 §7.4 I | T9 |
| 6 | WCS alternas sin SIP | Con SIP en la cabecera, la WCS `A` devuelve el píxel exacto (error < 0,01 px) | La WCS principal conserva la SIP | §2.1 |
| 7 | λ en el píxel medido | Lector falso de `CWAVE`/`CBAND` → valores del píxel pedido; píxel fuera de rango → error | Devuelve `wavelength_method = cwave_cband` | T7, T9 |
| 8 | Centroide en marco nativo | T1 (idénticas), T2 (WCS desplazado), T3 (fuente movida 1,0 px) | Error de posición < 0,05 px en T3 sin ruido `[VERIFICAR]`; σ_stat > 0 con ruido | §1, A2 |
| 9 | Agregado astrométrico | Dos fechas → Δ, separación, ángulo; N fechas → ajuste lineal; piso `σ_wcs` aplicado | Con el piso, σ ≥ 0,3″/√N; sin él, la prueba falla | §4.3 |
| 10 | Fotometría de apertura | T4 (×1,5), T5 (escala distinta, flujo igual) | Conversión MJy/sr → µJy con `OMEGA`; piso de 3 % aplicado | §4.3 |
| 11 | Reglas de comparabilidad | T6, T7, T8, T10, T11, T12, una prueba por regla | Cada fallo produce `check` + `issue` con `code`, `paths`, `detail` | §4.1 |
| 12 | Ensamblado y `outcome` | Tabla de verdad: checks + significancia → `outcome` correcto | El JSON valida con el modelo de la tarea 1 | §3 |
| 13 | Precálculo del caso real (ε Indi B) | Regresión R-1, R-2, R-3 con recortes guardados (prueba marcada `slow`, sin red en CI) | Reproduce el anexo B dentro de σ; escribe `data/derived/` y manifiesto (Johann) | B.2, B.3 |

**Ruta crítica para la demo:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9 → 11 → 12 → 13. Las tareas 7 y 10 (brillo) van después si hay tiempo: son el "control", no el caso obligatorio.

**Corte por tiempo (congelación a las 02:00):** si no alcanza, el mínimo defendible es tareas 0–9 + 12 + 13 solo para movimiento. El `AnalysisResult` sale con `photometry: null`; eso es válido según el contrato.

## 3. Diseño de las pruebas sintéticas

Todas usan un generador con semilla fija. Todo lo generado lleva `is_synthetic = true` y nunca se mezcla con datos reales.

**Escena base** (parecida a un recorte real de SPHEREx, anexo B):

| Parámetro | Valor | Por qué |
| --- | --- | --- |
| Tamaño | 21 × 21 px | Como un recorte de 0,02° (≈ 12 px) con margen |
| Escala | 6,15″/px, proyección TAN (sin SIP), salvo en T6 | Escala real de SPHEREx |
| PSF | Gaussiana circular, FWHM 1,2 px | FWHM medida 1,0–1,3 px |
| Flujo de la fuente | Pico de 1000 en unidades de MJy/sr | SNR ≈ 100–160, como ε Indi B |
| Ruido | Gaussiano, VARIANCE constante conocida; sin ruido en las pruebas exactas | Separar el error del método del error del ruido |
| FLAGS | Cero, salvo lo que pida cada prueba; cabecera con `MSKNnnnn`/`MSKMnnnn` como la real | Probar la lectura por nombre |
| `OMEGA_MEDIAN` | 37,86 arcsec² | Valor real de la cabecera |
| `CRPIX1A`, `CRPIX2A` | −375, −147 | Valores reales de un recorte (0001 §7.4 I) |

**Casos:**

| # | Construcción | Esperado |
| --- | --- | --- |
| T1 | A y B idénticas | separación = 0 (± 1e-6″ sin ruido); `no_significant_change` |
| T2 | B con `CRVAL` desplazado 2 px y la fuente desplazada igual en píxeles (misma posición en el cielo) | separación en el cielo ≈ 0; separación en píxeles ≈ 2 px (prueba de que se mide en el cielo) |
| T3 | Fuente en B desplazada (+1,0; 0) px, mismo WCS | separación = 6,15″ ± tolerancia; `change_measured` si la significancia supera `TEST_CONFIG` |
| T4 | Flujo de B ×1,5; misma λ | ratio = 1,5 ± σ |
| T5 | B con unidades escaladas (valores ×2 y `BUNIT` coherente) y mismo flujo físico | ratio = 1,0 ± σ |
| T6 | Bit `HOT` sobre el centro en B | B descartada: `bad_pixels_near_target`; `not_evaluable` si quedan < 2 |
| T7 | Lector de `CWAVE` falso: A = 1,65 µm, B = 2,38 µm | `flux_change` → `not_comparable` (`wavelength_mismatch`) |
| T8 | Pico al nivel del ruido | `target_not_detected` (`low_snr`) |
| T9 | Recorte con `CRPIX1A = -375`; el lector de `CWAVE` devuelve λ distinta según x | Se lee el píxel x + 376; con un origen equivocado, la prueba falla |
| T10 | Sin muestra de tiempo UTC o sin VARIANCE | `data_error` / `not_evaluable` con `paths` |
| T11 | Dos entradas con el mismo `acquisition_id` y distinto detector | `insufficient_epochs` |
| T12 | Una entrada con `identity_status = unresolved` | `identity_unresolved` |

**Pruebas de propiedad** (baratas y útiles): para desplazamientos aleatorios de −2 a +2 px sin ruido, el centroide recupera el valor inyectado (tolerancia `[VERIFICAR]` tras la tarea 8).

## 4. Datos reales (tarea 13)

- Se guardan **localmente** (fuera de Git, `data/raw/`) los recortes de ε Indi B usados en el anexo B, con su URL, versión y checksum. El manifiesto lo define Johann (0001 §4.2).
- La prueba de regresión compara con el anexo B: movimiento (3,88; −2,57)″/año dentro de σ; R-2 `no_significant_change`; R-3 `not_comparable`.
- En CI se salta si no están los archivos (marcador `slow`). Nunca se reemplaza por datos sintéticos.

## 5. Qué queda bloqueado hasta aprobar la ficha 0010

| Bloqueo | Quién lo libera | Afecta a tareas |
| --- | --- | --- |
| Tolerancia Δλ/CBAND, SNR mínima, significancia mínima | Sebastián | 2 (valores reales), 11, 12 |
| ¿`spectral.local` lo calcula `Observation` o este módulo? | Johann | 7 |
| ¿Carpeta `backend/app/analysis` o `analysis/`? | Johann + Mateo (ADR 0010) | 0 |
| Formato del manifiesto offline | Johann | 13 |
| Caso guiado elegido (ε Indi B propuesto) | Sebastián + equipo | 13 |

Las tareas 0, 1, 3, 4, 5, 6 y 8 no dependen de ningún umbral. Se pueden empezar en cuanto la ficha se apruebe, aunque Sebastián todavía esté ajustando valores.
