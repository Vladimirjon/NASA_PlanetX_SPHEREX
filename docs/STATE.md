# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, noche (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora

- Pitch (14-nov tarde): presentación ES de 7 diapositivas hecha como Artifact (fuera del repo), con fotos reales de NASA y el guion en las notas. Faltan animaciones por afinar, la versión en inglés, los dos PDF, el nombre y las capturas de la app. Detalle y enlace: `docs/HANDOFF_PITCH.md`.
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`, no `WCS-WAVE`. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo (rol: movimiento y brillo; PR #8): **primera entrega = movimiento de ε Indi B como candidato**, nunca "evaluado"; brillo a la 2.ª entrega; números del anexo B pendientes de recalcular (0010 §0, condiciones de Sebastián). ADR 0010 aceptado (Dax, Johann). Resultado como JSON estático en `frontend/public/demo/` (Dax, Daniel, Johann). Falta la **aprobación humana de la ficha 0010** para programar; la prueba χ² se reutiliza de `science/validation.py`.
- Mateo (rama `feat/measurement-motion`, PR #11): movimiento de ε Indi B implementado con los controles de Sebastián (0034): registro con 15 estrellas Gaia (dispersión 0,16″/0,21″ por eje, se sostiene el 0,3″), sin vecinas a < 3 px, pendiente con λ compatible con 0 (Ba/Bb), sensibilidad por pasada ≤ 0,16″/año. μ = (3,907; −2,476) ± 0,062″/año frente a Gaia (3,982; −2,467). Sigue como **candidato** (`threshold_exceeded_unverified`, techo OBSERVADO). Evidencia para su checklist: `docs/reviews/measurement/`. Falta: que Sebastián audite los `unknown`, que Daniel lo muestre en la UI y la recuperación inyectada (0034 §2).
- Rama `docs/observation-schema`: borrador verificable del contrato en `contracts/` (schema de `Observation`, schema del manifiesto offline, ejemplo real DR1 y sintéticos). `mise run check-contracts` lo valida sin red. Agrega la regla de IDs (probada con 906 filas reales) y los códigos cerrados. Responde a 0010 anexo E: la λ de una medición la lee `AnalysisResult` en el píxel medido, y `spectral.local` queda para un punto de referencia. Sigue en **borrador** hasta que lo revisen Mateo, Daniel y Sebastián.
- **14-nov noche · PR 12 `feat/validation-package-eps-indi-b` (Johann + agentes):** paquete verificable del par D3 de ε Indi B (par confirmado por el equipo: A `2025W24_1A_0245_4` DR1, B `2026W40_1A_0070_2` QR3; ficha 0032 §4.1). Se regenera con `uv run --locked --script scripts/build-validation-package.py` (~200 MB; originales en `data/raw/`, nunca al repo) y se comprueba sin red con `--verify`. Deja `data/packages/eps-indi-b-d3/`: manifiesto validado contra `contracts/package-manifest.schema.json`, 2 recortes nativos de 0,12° (IMAGE, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE), 2 ventanas CWAVE/CBAND y sha256 de originales, recortes y calibración. Solo el manifiesto, el link-report y el README están en git; los FITS no (`.gitignore`). **Probado:** IMAGE/FLAGS/VARIANCE/ZODI de cada recorte son idénticos bit a bit al original (caja nativa 0-based: A x0=759,y0=1111; B x0=159,y0=1149; 70×70); `WCS-WAVE` de cada imagen = el de su calibración; DR1 y QR3 publican una sola versión de Spectral WCS (copias idénticas); 22 estrellas Gaia (G<18) caen dentro de cada recorte; 22 pruebas offline en `tests/test_build_validation_package.py`. **Regla de λ acordada (Mateo, Sebastián, 14-nov):** la λ de una medición = CWAVE/CBAND en el píxel nativo entero más cercano al centroide medido de cada época (empates hacia arriba, sin interpolar), registrando píxel y método; `spectral.local` del manifiesto es solo la referencia del centro de la caja. `--lambda-at` la calcula y reproduce los valores de Mateo (A 793,1146 → 1,934120774/0,04693117 µm; B 195,1184 → 1,933309913/0,047647767 µm). **Estado:** el paquete queda `unverified` y offline `incomplete` (falta el contenido del caso); `case_ref` `eps-indi-b-d3-pair` y `region_id` `eps-indi-b-d3-cutout-box` rev. 1 aceptados por Sebastián. El par sigue siendo **candidato** hasta completar alineación, calidad e incertidumbre (Sebastián y Mateo).
- Revisión Codex del generador: 6 hallazgos corregidos y verificados; revisión cruzada final sin defectos (estática).

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
- Mateo: ficha `0010` (`AnalysisResult`), plan TDD `0011` y ADR `0010`, sin código. Criterios provisionales de Sebastián incorporados: R6 Δλ/min(CBAND) ≤ 0,02 (solo ε Indi B), SNR ≥ 5, ≥ 5σ con covarianza; ε Indi B = candidato (falta C1–C7). Falta la aprobación de Sebastián y Johann, y acordar la carpeta. Última revisión documental integrada en PR #8.
- Sebastián: trabajo de `scientific-rules` ya integrado en `main` (PR #9): fichas 0030–0033, ADR 0030, `science/validation.py`, `science_preview/` y tests. Sigue pendiente decidir con Dax y Johann dónde vive `science/` de forma definitiva.
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
