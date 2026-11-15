# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, noche (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- **14-nov noche · rama `integration/main-ready` (Dax + agentes):** producto funcional de punta a punta.
  - Backend `backend/` (FastAPI, hexagonal ADR 0040/0041): `/resolve`, `/search` (148 objetos reales + tolerante a errores, ADR 0044), `/observations`, `/series`, `/series/{id}/frames/{i}`, `/hips`. Caché local→IRSA por capas, un cortacircuitos por servicio. 141 tests.
  - Frontend `frontend/`: app única (`index.html`): mapa propio WebGL2 tipo Aladin (ADR 0042) + rail de los 5 objetos del reto + panel temporal con línea de tiempo, Loop/Diferencia/Color, semáforo y procedencia (ADR 0043). 99 tests (1 intermitente, ver PR).
  - Ciencia: `docs/context/12` (mapa de datos). Los 5 objetos dan series reales de 2–4 pasadas; demo offline en `frontend/public/demo/`.
  - Correr: `mise run api-dev` + `mise run web-dev` (o `uv run --directory backend uvicorn --factory skyshift.api.app:create_app` y `pnpm --dir frontend dev`). Smoke en vivo: `mise run smoke`.
  - Pendiente: buscador del frontend aún no usa `/search`; app usa tween propio en vez de `engine.flyTo`; test de arrastre intermitente; revisión de paridad visual (R1) sobre el motor nuevo; UI necesita otra ronda (feedback de Dax: "pésima").
- La demo vieja de WISE 0855 (`~/Desktop/skyshift-demo`) NO contiene a WISE 0855 (posición de 2010): no usarla.
- Ciclo 1 (rama `docs/arquitectura-observation`): **borrador** `docs/specs/0001-arquitectura-observation.md` (flujo de datos, `Observation` propuesto, matriz de interfaces, fallos). Johann lo propone; roles y contrato **sin ratificar**. Falta la revisión de Mateo y Daniel, de Sebastián (requisitos científicos) y de Dax (frontera `Region`).
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`; `WCS-WAVE` es aproximación para selección según D12 §2.2. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.

- Pitch (14-nov tarde): presentación ES de 7 diapositivas hecha como Artifact (fuera del repo), con fotos reales de NASA y el guion en las notas. Faltan animaciones por afinar, la versión en inglés, los dos PDF, el nombre y las capturas de la app. Detalle y enlace: `docs/HANDOFF_PITCH.md`.
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`, no `WCS-WAVE`. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo (rol: movimiento y brillo; PR #8): **primera entrega = movimiento de ε Indi B como candidato**, nunca "evaluado"; brillo a la 2.ª entrega; números del anexo B pendientes de recalcular (0010 §0, condiciones de Sebastián). ADR 0010 aceptado (Dax, Johann). Resultado como JSON estático en `frontend/public/demo/` (Dax, Daniel, Johann). Falta la **aprobación humana de la ficha 0010** para programar; la prueba χ² se reutiliza de `science/validation.py`.
- Mateo (rama `feat/measurement-motion`, PR #11): movimiento de ε Indi B implementado con los controles de Sebastián (0034): registro con 15 estrellas Gaia (dispersión 0,16″/0,21″ por eje, se sostiene el 0,3″), sin vecinas a < 3 px, pendiente con λ compatible con 0 (Ba/Bb), sensibilidad por pasada ≤ 0,16″/año. μ = (3,907; −2,476) ± 0,062″/año frente a Gaia (3,982; −2,467). Sigue como **candidato** (`threshold_exceeded_unverified`, techo OBSERVADO). Evidencia para su checklist: `docs/reviews/measurement/`. Falta: que Sebastián audite los `unknown`, que Daniel lo muestre en la UI y la recuperación inyectada (0034 §2).
- Rama `docs/observation-schema`: borrador verificable del contrato en `contracts/` (schema de `Observation`, schema del manifiesto offline, ejemplo real DR1 y sintéticos). `mise run check-contracts` lo valida sin red. Agrega la regla de IDs (probada con 906 filas reales) y los códigos cerrados. Responde a 0010 anexo E: la λ de una medición la lee `AnalysisResult` en el píxel medido, y `spectral.local` queda para un punto de referencia. Sigue en **borrador** hasta que lo revisen Mateo, Daniel y Sebastián.

## Hitos (Ecuador, UTC−5)
| Hora | Hito |
| --- | --- |
| Sáb (hoy) | Decidir visión, stack y roles → ADRs |
| Dom 02:00 | Congelación de features |
| **Dom 09:00** | **Entrega local: repo público + LICENSE, demo pública, slides ≤7, ficha ES/EN** |
| Dom 11:00 | Pitch en español + Q&A |
| Dom 23:59 | Cierre global |

## Dueños (pendiente de asignar)
| Persona | Rol | Carpetas |
| --- | --- | --- |
| Dax | — | — |
| — | — | — |
| — | — | — |
| — | — | — |
| — | — | — |

## Decisiones pendientes (del equipo, no de la IA)
1. Visión de producto y "momento wow" (ver `docs/context/04-vision-ux.md`).
2. Stack: el de ADR 0003 es solo recomendación; cada dueño de módulo decide con su agente y deja ADR. Elegir el hosting del backend (Cloud Run pide tarjeta; HF Spaces no).
3. Reparto de roles.
4. Nombre de la app (provisional: SkyShift).

## Bloqueos y riesgos
- Resuelto 14-nov tarde: QR3 vacío solo en WISE 0855; los otros 4 objetos suman una pasada QR3 (ver Ahora).
- [medido 14-nov, Mateo] Épocas DR1+QR3: WISE 0855 3 (QR3 vacío), Barnard 3, ε Indi B 4, RW Aur 3, R Dra 3 pasadas (corregido con la regla > 45 d de D12 §5.2). Detalle: `docs/specs/0010-analysis-result.md` anexo B. ε Indi B resuelto con 2MASS (IRSA Gator) sin SIMBAD.
- [medido] Barnard, RW Aur y R Dra **saturan** SPHEREx; WISE 0855 es demasiado débil en una exposición (SNR ≤ 4,7). Solo ε Indi B es medible (movimiento ~1 px en 1,4 años, medido). Falta una variable no saturada → Sebastián.
- IRSA TAP muy lento hoy (315 s / 502): usar SIA2.
- 14-nov tarde, comprobado (ficha 0001 §7.4): QR3 está vacío en WISE 0855, pero añade fechas posteriores a DR1 en Barnard, RW Aur y R Dra. WISE 0855 tiene 3 grupos de fechas en DR1 y un par D3 may-2025/may-2026 con la misma λ en el punto (candidato, sin evaluar). IRSA da 502 intermitentes, con o sin `TIME`. ~~Pendiente: resolver Epsilon Indi B cuando SIMBAD vuelva.~~ Resuelto (ficha 0010). Ojo: WISE 0855 no se detecta en una exposición (ficha 0010 B.4), así que ese par D3 no es medible.

## Preguntas para mentores (Bloque 4)
- Duración exacta del pitch y del Q&A.
- (agregar)
