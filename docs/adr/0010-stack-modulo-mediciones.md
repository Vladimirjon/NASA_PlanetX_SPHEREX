# 0010 · Stack del módulo de mediciones (`AnalysisResult`)

- Estado: **propuesta** (Mateo). Johann está de acuerdo con integrarlo en el backend; falta el visto bueno de Dax (dueño de `backend/`).
- Fecha: 2026-11-14 (revisión 2, noche)
- Decidido por: Mateo (dueño del módulo, `AGENTS.md` §3). Numeración en el rango 0010–0019 de Mateo.

## Contexto
La ficha `docs/specs/0010-analysis-result.md` pide medir posición y flujo sobre FITS reales de SPHEREx en el marco nativo de cada imagen (WCS TAN-SIP, FLAGS, VARIANCE, `CWAVE`/`CBAND`), con covarianzas y una prueba χ². La demo se precalcula offline. Desde el PR #6 ya existe un backend Python 3.13 + `uv` en `backend/` (paquete `skyshift`, hexagonal según ADR 0041) que lee recortes por rango desde S3 y ya implementa pasadas, máscara de FLAGS, movimiento con paralaje y semáforo.

## Opciones consideradas
1. **Integrarlo en el backend existente** (`backend/src/skyshift/`), reutilizando sus módulos de dominio y agregando solo lo que falta. Pros: no se duplica lógica científica y se hereda la verificación (`pytest`, `ruff`, `pyright --strict`, prueba de arquitectura). Contras: hay que respetar las capas de ADR 0041 y coordinar con Dax.
2. Proyecto `uv` aparte en `analysis/`. Pros: independencia. Contras: duplicaría `flags`, `visits`, `motion` y `wavelength`, con riesgo de reglas distintas.
3. Medir en el navegador (JS): descartado por ADR 0003.

## Decisión
Opción 1. El código va en `backend/src/skyshift/`, siguiendo ADR 0041:

| Capa | Ubicación |
| --- | --- |
| Dominio puro | `domain/measurement/` (astrometría, significancia, fotometría, reglas) |
| Puertos | `ports/spectral_calibration.py` (`CWAVE`/`CBAND`), `ports/reference_stars.py` (Gaia) |
| Adaptadores | lectura por rango del Spectral WCS en S3; consulta de cono a IRSA `gaia_dr3_source` con el cliente `http.py` existente |
| Aplicación | `application/measure_target.py`, `application/precompute_measurement.py` |
| API | ninguna ruta hasta que `AnalysisResult` esté en `contracts/openapi.yaml` |

**Dependencias.** El backend ya fija astropy 8.0.2, numpy 2.5.4, pydantic 2.14.3, pytest 9.2.0, ruff 0.17.5 e hypothesis. Solo se agregan:

| Paquete | Versión | Justificación |
| --- | --- | --- |
| scipy | 1.18.1 | Ajuste no lineal del centroide (`astropy.modeling`) y `Φ⁻¹` / χ² para la prueba de significancia |
| photutils | 3.1.1 | Centroides, aperturas y ajuste con la ePSF oficial (opción A3) |

`pyvo` **no** se agrega: el backend ya consulta IRSA con su propio adaptador HTTP. Johann comprobó que las versiones se resuelven juntas en Python 3.13.

**Contrato.** El esquema se escribe a mano en `contracts/analysis-result.schema.json` (contrato primero, como `observation.schema.json`) y se valida con `mise run check-contracts`. Los modelos pydantic deben coincidir con él, y una prueba lo comprueba. Si más adelante se expone por API, se agrega primero a `contracts/openapi.yaml`.

## Consecuencias
- La lógica científica es pura y testeable sin red; la E/S queda en adaptadores.
- Los umbrales científicos **no tienen valores por defecto en el código**: llegan en una configuración explícita con su fuente (Sebastián). Las pruebas usan valores de prueba rotulados.
- Se usan las tareas `mise` que ya existen en el backend para pruebas y lint; se agrega una tarea `precompute` para el candidato.
- Cualquier cambio en `domain/flags.py`, `visits.py`, `motion.py` o `wavelength.py` se coordina con Dax, porque los usa la serie temporal.
