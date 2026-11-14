# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, noche (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora

### Producto en `main` (PR #6, Dax + agentes)
- Backend `backend/` (FastAPI, hexagonal, ADR 0040/0041): `/resolve`, `/search` (148 objetos reales, tolerante a errores, ADR 0044), `/observations`, `/series`, `/series/{id}/frames/{i}`, `/hips`. Caché local→IRSA por capas, un cortacircuitos por servicio. 141 tests en verde (comprobado 14-nov noche).
- Frontend `frontend/`: app única (`index.html`): mapa WebGL2 tipo Aladin (ADR 0042) + rail de los 5 objetos del reto + panel temporal con Loop/Diferencia/Color, semáforo y procedencia (ADR 0043). 99 tests en verde (comprobado 14-nov noche; uno es intermitente).
- Ciencia de datos: `docs/context/12` (mapa de datos). Los 5 objetos dan series reales de 2–4 pasadas; demo offline en `frontend/public/demo/`.
- Correr: `mise run api-dev` + `mise run web-dev` (o `uv run --directory backend uvicorn --factory skyshift.api.app:create_app` y `pnpm --dir frontend dev`). Smoke en vivo: `mise run smoke`.
- Pendiente: el buscador del frontend no usa `/search`; la app usa un tween propio en vez de `engine.flyTo`; test de arrastre intermitente; revisión de paridad visual (R1) sobre el motor nuevo; la UI necesita otra ronda (Dax: "pésima").
- La demo vieja de WISE 0855 (`~/Desktop/skyshift-demo`) NO contiene a WISE 0855 (posición de 2010): no usarla.

### Contrato `Observation` vigente (propuesta de Johann, falta el OK de Dax)
- **Manda `contracts/openapi.yaml` v0.3** (`Observation`, `Visit`, `Frame`, `Comparability`, `Series`): es lo que el backend sirve y el frontend consume. Se programa contra esto.
- `contracts/observation.schema.json` (`0.1-draft`) y la ficha `0001` son la **evolución futura**, no implementada. No programar contra ellos ni presentarlos como funciones disponibles.
- El paso de uno a otro es aditivo y opcional (campos candidatos y correspondencia en `docs/reviews/2026-11-14-triage-specs-main.md`); cada campo nuevo necesita OK de Dax y, si es científico, de Sebastián. Cuando se ratifique, queda en un ADR.

### Fichas y ramas del Ciclo 1 (todas en borrador)
- Johann: ficha `0001` + schemas en `contracts/` (`mise run check-contracts`, 0 fallos). Falta la revisión de Mateo, Daniel, Sebastián y Dax (frontera `Region`).
- Mateo: ficha `0010` (`AnalysisResult`), plan TDD `0011` y ADR `0010`, sin código. Criterios provisionales de Sebastián incorporados: R6 Δλ/min(CBAND) ≤ 0,02 (solo ε Indi B), SNR ≥ 5, ≥ 5σ con covarianza; ε Indi B = candidato (falta C1–C7). Falta la aprobación de Sebastián y Johann, y acordar la carpeta.
- Sebastián: rama `scientific-rules` **sin PR y sin integrar** (fichas 0030–0033, ADR 0030, `science/validation.py`, `science_preview/`, tests). Va 50 commits por detrás de `main` y pone `science/` en la raíz, fuera de `backend/`. Decidir con Dax y Johann dónde vive antes del congelamiento.
- Datos (Johann): contrastado con un producto DR1 real, el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND` y `WCS-WAVE` es aproximación para selección (D12 §2.2). Contradice `context/03` §3 y `context/06` §5.2, **aún sin corregir**.

### Pitch (Johann)
- Presentación ES de 7 diapositivas como Artifact (fuera del repo), con fotos reales de NASA y el guion en las notas. Faltan: animaciones, versión en inglés, los dos PDF, el nombre y las capturas de la app, y la línea en `docs/AI_USAGE.md`. Detalle y enlace: `docs/HANDOFF_PITCH.md`.

## Hitos (Ecuador, UTC−5)
| Hora | Hito |
| --- | --- |
| Sáb (hoy) | Decidir visión, stack y roles → ADRs |
| Dom 02:00 | Congelación de features |
| **Dom 09:00** | **Entrega local: repo público + LICENSE, demo pública, slides ≤7, ficha ES/EN** |
| Dom 11:00 | Pitch en español + Q&A |
| Dom 23:59 | Cierre global |

## Dueños
Roles confirmados por el equipo (registrado en la rama `scientific-rules`, 14-nov). Carpetas: lo que cada uno ya trabaja según Git; falta que el equipo lo ratifique.

| Persona | Rol | Carpetas (de hecho, por ratificar) | Fichas / ADR |
| --- | --- | --- | --- |
| Dax | Región, motor del cielo, backend y app integrada | `backend/`, `frontend/` | 0040–0049 |
| Johann | Datos, contratos e integración; pitch | `contracts/` (schemas en borrador), `scripts/check_contracts.py`, `docs/HANDOFF_PITCH.md` | 0001 |
| Mateo | Mediciones (`AnalysisResult`) | por acordar con Johann | 0010–0019 |
| Sebastián | Validación e interpretación científica | `science/`, `science_preview/` (rama sin integrar) | 0030–0039 |
| Daniel | UX/UI | por acordar con Dax (la UI vive en `frontend/`) | por asignar |

## Decisiones pendientes (del equipo, no de la IA)
1. Ratificar el contrato vigente (sección «Contrato `Observation` vigente»): Dax + Johann.
2. Dónde se integra `science/` de Sebastián: Sebastián + Dax + Johann, antes de Dom 02:00.
3. Hosting de la demo pública (Cloud Run pide tarjeta; HF Spaces no). Es requisito de la entrega de Dom 09:00.
4. Nombre de la app (provisional: SkyShift).
5. Stack: de hecho es el de ADR 0040–0044; ADR 0003 queda como recomendación. Falta dejarlo ratificado.

## Bloqueos y riesgos
- [medido 14-nov, Mateo] Épocas DR1+QR3: WISE 0855 3 (QR3 vacío), Barnard 3, ε Indi B 4, RW Aur 3, R Dra 4 grupos exploratorios; D12 §5.2 agrupa R Dra en 3 pasadas con >45 días. QR3 añade fechas posteriores a DR1 en Barnard, RW Aur y R Dra. Detalle: ficha `0010` anexo B. ε Indi B resuelto con 2MASS (IRSA Gator) sin SIMBAD.
- [medido] Barnard, RW Aur y R Dra **saturan** SPHEREx; WISE 0855 es demasiado débil en una exposición (SNR ≤ 4,7), así que su par D3 may-2025/may-2026 no es medible. Solo ε Indi B es medible (movimiento ~1 px en 1,4 años). Falta una variable no saturada → Sebastián.
- IRSA TAP muy lento (315 s / 502) y SIA2 con 502 intermitentes, con o sin `TIME`: usar SIA2 y la demo offline como respaldo.

## Preguntas para mentores (Bloque 4)
- Duración exacta del pitch y del Q&A.
- (agregar)
