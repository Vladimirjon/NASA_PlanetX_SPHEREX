# Revisión de fichas de main — 14 de noviembre de 2026

Las fichas 0001 y 0010 son propuestas, no un contrato aprobado ni una descripción de funciones ya disponibles. D12 = `docs/context/12-mapa-de-datos-spherex.md`; las referencias a líneas se refieren al estado de esta revisión. Los valores exploratorios de 0010 no se presentan como resultados del producto. El equipo y ciencia deben revisar las propuestas; no se cambia el contrato aquí.

| Sección / afirmación | Estado y evidencia | Acción recomendada |
| --- | --- | --- |
| 0010 B.1: R Dra tiene cuatro épocas | ERRÓNEO científicamente: D12 §5.2, líneas 193–210: tres pasadas; la última mezcla DR1 y QR3. Los grupos exploratorios no equivalen a pasadas con salto >45 días. | Reagrupar con la regla y conservar las fechas originales. |
| 0010 §4.1 R1: dos adquisiciones distintas bastan para épocas | ERRÓNEO científicamente: D12 §5.2 y §6 pasos 4 y 13, líneas 193–195 y 221–238: deben ser pasadas distintas con salto >45 días. | Exigir dos visitas, no solo dos adquisiciones. |
| 0010 §4.1 R7–R8: varios bits, incluso OVERFLOW y GHOST, solo advierten | ERRÓNEO científicamente para comparación: D12 §3, líneas 118–120, y §6 paso 13: máscara `0x3FD2CEC7`; esos bits están incluidos. La política de fotometría es distinta. | Aplicar máscara de comparación para el semáforo; documentar políticas separadas. OUTLIER no se enmascara, se marca y baja el semáforo (D12 §3). |
| 0010 §3: `parallax_not_modeled` como mera información | ERRÓNEO científicamente como modelo de posición esperada: D12 §6.1 y §7, líneas 217–218 y 244–282, exige movimiento propio y paralaje cuando se conocen. | Propagar ambos; señalar ausencia y no declarar evaluado un control no demostrado. |
| 0010 §4.1 R6: tolerancia pendiente basada en Δλ/CBAND | CONTRADICE: `contracts/openapi.yaml:356` y `docs/specs/0002-analizador-temporal.md:29` fijan λ/(4R), aún por validar por ciencia (D12 §10). | Para la serie usar λ/(4R) frente a referencia común; una tolerancia fotométrica alternativa requiere decisión científica. |
| 0001 §3.5 y 0010 §2.1/§4.2: WCS-WAVE solo visual y no sirve para seleccionar pares | CONTRADICE: `docs/context/12-mapa-de-datos-spherex.md:83` y `docs/specs/0002-analizador-temporal.md:28` permiten la aproximación local para selección; `backend/src/skyshift/application/build_series.py:244` la usa. D12 recomienda CWAVE/CBAND para ciencia. | Conservar la advertencia de bordes; contrastar calibración exacta antes de medición científica y revisar con ciencia el margen de error. |
| 0001 §3.4 y 0010 §2.1: FINAST/L2DQA no se usan como control | CONTRADICE: `docs/specs/0002-analizador-temporal.md:25` exige ambos como filtro; D12 §6 paso 3. | Mantener la guarda defensiva aunque no discrimine los productos publicados. |
| 0001 §3 y 0010 §3: contratos propuestos y `AnalysisResult` | CONTRADICE si se tratan como implementados: `contracts/openapi.yaml:246`, `:300`, `:326`, `:344` define Observation, Frame, Comparability y Series, sin AnalysisResult; ADR `docs/adr/0008-arquitectura-y-patrones.md:18` fija fronteras hexagonales. | Conservar como propuesta; no reemplazar contrato ni atribuir mediciones a la API actual. |
| 0001 §1.3/§3.4: rango `em_min/em_max` no es λ local; 0010 R6 usa λ del píxel | CORRECTO: D12 §2.2 y §5.1. | Mantener separación entre rango de búsqueda y λ por píxel; identificar método y calibración. |
| 0001 §1.3 y 0010 §4.2: PNG solo visualización | CORRECTO: D12 §1 y §9; nunca medir sobre HiPS PNG. | Mantener. |
| 0001 §4.2: software no asigna confirmado | CORRECTO: D12 §6.13 y `contracts/openapi.yaml:330`. | Mantener OBSERVED/EVALUATED; confirmación requiere evidencia y juicio humano. |
| 0010 B.1: QR3 vacío para WISE 0855 y disponible para los otros cuatro | CORRECTO: D12 §5.2, líneas 201–205. | Mantener cobertura, corregir agrupación de R Dra. |
| 0001 §3.3–3.5: identidad versionada, muestras temporales con escala y linaje por campo | ÚTIL A FUTURO: `obs_id` por sí solo no identifica producto y revisión; `contracts/openapi.yaml:246–257` conserva URL pero no identidad resuelta o escala explícita. | Evaluar adiciones opcionales abajo sin prometer disponibilidad. |
| 0010 §3: mediciones, incertidumbres, método, entradas exactas y resultados sin detección | ÚTIL A FUTURO: `Series` y `Comparability` actuales no son una API de fotometría o astrometría. | Diseñar contrato de medición separado con ciencia y dueños antes de implementarlo. |
| 0001 §1.2: arquitectura de intercambio y preparación | ÚTIL A FUTURO: ADR 0006 y ADR 0008 mantienen caché por capas y dependencias `domain ← application ← adapters/api`. | Alinear responsabilidades con puertos existentes; no imponer módulos nuevos ni cambios de dueño sin acuerdo. |

El glosario fusiona las dos definiciones de MJD: conserva la escala explícita y `MJD-AVG` como punto medio, coherente con D12 §2.1 y §6. Los duplicados de FINAST, centroide y magnitud AB/Vega se consolidaron sin perder su significado.

## Correspondencia de campos

| Propuesta | Contrato v0.2 | Brecha / tratamiento |
| --- | --- | --- |
| Observation `source.obs_id`, `source.collection`, `detector`, `products.native.uri` | Observation `obs_id`, `collection`, `detector`, `access_url` | Equivalencia parcial; `obs_id` no identifica versión ni detector por sí solo. |
| `source.publisher_did`, `acquisition_id`, `identity_status`, `products.native.version`, `sha256` | URL y `Provenance.sha256` opcional | Faltan DID, adquisición, estado y versión de producto por observación; no confundir checksum de recurso derivado con original. |
| `time.samples`, `time.exposure_s` | Observation `t_mid`, `mjd_mid`; Visit `t_start`, `t_end` | Falta escala explícita y tiempo de exposición; fecha de adquisición no es fecha de publicación. |
| `coverage`, `spatial_wcs`, `spectral.search_range_m`, `spectral.local` | Observation `wavelength_min_um/max_um` (rango); Frame `wavelength_um`, `bandwidth_um`, `predicted_position`; Series `grid` | El rango global no es λ local; faltan fuente/método de λ y referencia de calibración. WCS completa y huella son futuras, no se infieren. |
| `quality.flags`, `quality.variance`, `pipeline_assessment`, `ancillary`, `products.derived`, `Transformation`, `field_sources` | Frame `stats`, `provenance`; Series `rejected`, `warnings` y `grid` | Hay resumen y trazabilidad parcial; faltan política de máscara, referencias y transformaciones detalladas. |
| AnalysisResult `inputs`, `measurements`, `astrometry`, `photometry`, `outcome`, `method`, `issues` | Series `frames`, `rejected`, `warnings`, `provenance` | Solo hay correspondencia parcial de entradas y rechazos; no existen resultados ni incertidumbres de medición en estos esquemas. |
| AnalysisResult `comparability.status/checks` | Comparability `level/checks` | No son equivalentes: estado de aptitud/medición no es semáforo. Checks actuales tienen `name`, `passed`, `detail`, sin estado desconocido, criterio ni fuente. |
| AnalysisResult `target`, `region_ref`, `zone_of_interest` | Series `target`, `motion`, `fov_arcmin`, `grid`; Frame `predicted_position` | Posición y movimiento parcialmente representados; región versionada y zona de interés no están acordadas. |

## Adiciones candidatas al contrato (no implementadas)

Propuesta aditiva y opcional para revisión humana y científica, sin cambiar los campos existentes ni su obligatoriedad. No implica que el backend ya pueda poblarlos. Las URL de calibración deben proceder del servidor, nunca de una entrada arbitraria del cliente. El contrato completo de `AnalysisResult` requiere ficha y revisión propias.

```yaml
# Fragmentos bajo components.schemas, para incorporar a properties existentes
Observation:
  properties:
    publisher_did: {type: string, description: "Original archive publisher identifier."}
    acquisition_id: {type: string, description: "Verified acquisition identifier."}
    identity_status: {type: string, enum: [resolved, unresolved]}
    product_version: {type: string, description: "Native product processing version."}
    time_scale: {type: string, enum: [UTC], description: "Only when verified from FITS metadata."}
    exposure_s: {type: number, minimum: 0}
Frame:
  properties:
    wavelength_method: {type: string, enum: [wcs_wave_approximation, cwave_cband]}
    spectral_calibration_ref: {type: string, description: "Verified calibration product and version."}
    comparison_mask: {type: integer, minimum: 0, maximum: 4294967295, description: "Applied FLAGS bitmask; OUTLIER is recorded separately."}
    outlier_present: {type: boolean}
```

No se propone añadir `AnalysisResult` a Series de forma implícita: astrometría y fotometría necesitan unidades, incertidumbres, criterios, procedencia y estados de ausencia explícitos. Tampoco se declara que el pipeline actual cumple todos los controles de D12: por ejemplo, la ficha 0002 pide significancia y procedencia completa; revisar el comportamiento antes de elevar el semáforo.

## Revisión diferencial de seguridad

Alcance: integración exclusivamente documental y referencias; sin cambios de ejecución, dependencias, validación, credenciales ni superficies de red. Riesgo directo bajo; el riesgo es inducir futuras implementaciones científicamente incorrectas o presentar propuestas como vigentes. Las discrepancias y límites quedan registrados arriba. No se ha realizado auditoría de seguridad del backend ni validación científica humana.
