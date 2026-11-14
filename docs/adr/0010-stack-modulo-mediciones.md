# 0010 · Stack del módulo de mediciones (`AnalysisResult`)

- Estado: **propuesta** (Mateo); falta acuerdo de Johann sobre la carpeta compartida
- Fecha: 2026-11-14
- Decidido por: Mateo (dueño del módulo, `AGENTS.md` §3). Numeración en el rango 0010–0019 de Mateo.

## Contexto
La ficha `docs/specs/0010-analysis-result.md` pide medir posición y flujo sobre FITS reales de SPHEREx, en el marco nativo de cada imagen, con WCS TAN-SIP, FLAGS, VARIANCE y `CWAVE`/`CBAND`. La demo se precalcula offline (0001 §4.2, 0010 anexo C). Hay que correrlo igual en Fedora y Windows. Las versiones se fijaron el 14-nov-2026 con `uv pip compile` para Python 3.13.

## Opciones consideradas
1. **Python 3.13 con `uv`, librerías astronómicas estándar** — astropy ya trae FITS, WCS con SIP, unidades, tiempo y `apply_space_motion`; photutils trae centroides, aperturas y ajuste con ePSF. Es lo que usan los tutoriales oficiales de IRSA. Contra: dependencias pesadas (numpy/scipy).
2. Implementación propia (numpy puro) — menos dependencias, pero habría que reescribir WCS con SIP y fotometría: alto riesgo de error científico.
3. Medir en el navegador (JS) — descartado por ADR 0003: reproyectar y leer SIP en JS es arriesgado.

## Decisión
Opción 1: Python 3.13 con `uv`, con estas versiones exactas:

| Paquete | Versión | Para qué |
| --- | --- | --- |
| astropy | 8.0.2 | FITS, WCS (SIP), unidades, `Time`, `SkyCoord` |
| numpy | 2.5.4 | matrices |
| scipy | 1.18.1 | ajuste no lineal (lo usa `astropy.modeling`) |
| photutils | 3.1.1 | centroides, aperturas, ePSF (opción A3) |
| pydantic | 2.14.3 | validar `AnalysisResult` y exportar JSON Schema para un futuro `contracts/openapi.yaml` |
| pyvo | 1.10.0 | SIA2 (solo en el precálculo con datos reales; lo puede aportar el módulo de Johann) |
| pytest | 9.2.0 | pruebas (desarrollo) |
| ruff | 0.17.5 | lint y formato (desarrollo) |

**Ubicación propuesta `[DECISIÓN con Johann]`:** dentro del proyecto `backend/` previsto en `docs/context/08` (paquete `backend/app/analysis/`, pruebas en `backend/tests/analysis/`), porque la tarea `precompute` ya está diseñada como `uv run python -m app.precompute`. Si el backend no se crea, se usa un proyecto `uv` propio en `analysis/` con la misma estructura interna.

## Consecuencias
- La lógica científica es pura y testeable sin red: recibe matrices y cabeceras ya cargadas. Las descargas quedan del lado de `Observation` (Johann).
- Los umbrales científicos (tolerancia Δλ/CBAND, SNR, significancia) **no tienen valores por defecto en el código**: llegan en una configuración explícita que firma Sebastián. Las pruebas usan valores de prueba rotulados.
- Tareas de `mise` por agregar cuando exista la carpeta: `test` (`uv run pytest`), `lint` (`uv run ruff check`), `precompute`. Cada una es un comando simple, válido en `cmd /c`.
- Lockfile `uv.lock` commiteado; dependencia nueva = una línea de justificación en el PR (`AGENTS.md` §4.9).
