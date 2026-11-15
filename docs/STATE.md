# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, noche (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- **15-nov 00:10 · Dax/Claude Code · integración final en `main`:** base = UI de Daniel (PR #19). Integrados: HiPS/vuelo nativo de `integration/main-ready`; textos honestos de «What changed?» por región (revisión de Mateo) y el par D3 de Sebastián junto al ajuste de 4 pasadas de ε Indi B (ambos Observado · candidato); precarga de visor/assets desde la landing y de las 5 series en el visor; barra de carga de 2 px. `frontend/universe/` NO entra (queda en `backup/universe-discarded` y `feat/phase0-foundations`). Pendiente humano: Sebastián confirma qué cifra de ε Indi B va en ficha/pitch (la app muestra ambas, rotuladas); la travesía 3D de entrada se probó y se descartó (15-nov); la intro es la original de Daniel (globo → vuelo al objeto).
- **14-nov noche · Mateo/Claude Code · revisión de las 5 regiones** (`docs/reviews/regions/`): solo ε Indi B permite afirmar un candidato de movimiento (Observado). **Copernix afirma cambios no medidos** en «What changed?» (`explain-i18n.ts:148-178`): WISE 0855 «shifted by 5.0″» (no se detecta) y Barnard «10.2″» son el movimiento *esperado*; RW Aur y R Dra «brightness changes» (saturadas). Textos propuestos por región en la revisión. Falta: Daniel/Dax corrigen la UI; Sebastián elige la cifra de ε Indi B (6,6″ ajuste D3 de 4 pasadas vs 6,05″ par D3) para Copernix, ficha y pitch. Recorrido D2→D3→D2 del PR #16 OK en local (`docs/reviews/d3-case/2026-11-14-recorrido-local.md`); sin demo pública todavía.
- Caso guiado D3 de ε Indi B (`docs/specs/0038`): paquete de Johann y controles de Mateo integrados en `main` (PR #12 y #14). La vista usa las dos exposiciones y conserva **Observado** para el desplazamiento del centro de luz (~6,05″ tras corregir el paralaje).
- Coordinación local: `docs/context/13-trabajo-en-una-computadora.md` reúne a Johann, Mateo y Sebastián; escritura serial o worktrees separados, sin tocar frontend. Paquete PR #12 y controles de Mateo (`feat/measurement-pair-controls`, `c643009`) aún requieren revisión/integración.
- Ciencia: `docs/specs/0037` resuelve λ del PR #12 (centro del recorte frente a centroide); IDs locales aceptados, paquete regenerado y verificado independientemente. Par aún pendiente de controles de 0036.
- Ciencia: revisión de PR #11 en `docs/specs/0036`; se reproduce Q del par, pero alineación, calidad completa, incertidumbre y sesgo de color siguen pendientes de evidencia y revisión humana. Mateo/Johann: FLAGS en centroide medido, residuos A/B, correlaciones e inyección.
- **14-nov noche · Dax/Cursor · encargo 06 catálogo+controles:** catálogo abierto (`catalog/`), buscador columna + `?name=`, modos/timeline/luz legibles, guía intro. Capturas `revision4-*`. Lint/test/build:copernix + check-landing + `copernix-qa-catalog.mjs` OK. Humano: revisar búsqueda y guía.
- **14-nov noche · Dax/Cursor · encargo 05 rediseño visor:** layout editorial (scrim, sin barra azul), `selection.ts` (marcador anclado; candidato; custom), dock delgado, sheet móvil. Capturas `revision3-*`. Lint/test/build:copernix + check-landing + `copernix-qa.mjs` OK. Humano: revisar visual y flujo candidato.
- **14-nov noche · Dax/Cursor · encargo 04 pulir visor:** panel lateral opaco, barra única, dock/legibilidad, bottom sheet móvil, `explain-i18n.ts` ES/EN. Capturas `docs/landing/copernix-qa/revision2-*`. Lint/test/build:copernix + `check-landing` OK. Humano: revisar visual.
- **14-nov noche · Dax/Cursor · encargo 02 visor Copernix:** UI nueva en `frontend/copernix/` (`base /viewer/`), scripts `dev:copernix`/`build:copernix`, demo en `/demo` vía Vite + `serve_landing`. Capturas `docs/landing/copernix-qa/`. Lint/test/build:copernix OK. Humano: revisar visual ES/EN.
- **14-nov · integración HiPS:** proxy con reintentos y límite, fuente backend, vuelo nativo y búsqueda conectada; prueba en vivo en `docs/reviews/integration/`. Pendiente revisión humana; arrastre AIT cerca del polo requiere investigación adicional.
- **14-nov noche · rama `integration/main-ready` (Dax + agentes):** producto funcional de punta a punta.
  - Backend `backend/` (FastAPI, hexagonal ADR 0040/0041): `/resolve`, `/search` (148 objetos reales + tolerante a errores, ADR 0044), `/observations`, `/series`, `/series/{id}/frames/{i}`, `/hips`. Caché local→IRSA por capas, un cortacircuitos por servicio. 141 tests.
  - Frontend `frontend/`: app única (`index.html`): mapa propio WebGL2 tipo Aladin (ADR 0042) + rail de los 5 objetos del reto + panel temporal con línea de tiempo, Loop/Diferencia/Color, semáforo y procedencia (ADR 0043). 99 tests (1 intermitente, ver PR).
  - Ciencia: `docs/context/12` (mapa de datos). Los 5 objetos dan series reales de 2–4 pasadas; demo offline en `frontend/public/demo/`.
  - Correr: `mise run api-dev` + `mise run web-dev` (o `uv run --directory backend uvicorn --factory skyshift.api.app:create_app` y `pnpm --dir frontend dev`). Smoke en vivo: `mise run smoke`.
  - Pendiente: buscador del frontend aún no usa `/search`; app usa tween propio en vez de `engine.flyTo`; test de arrastre intermitente; revisión de paridad visual (R1) sobre el motor nuevo; UI necesita otra ronda (feedback de Dax: "pésima").
- La demo vieja de WISE 0855 (`~/Desktop/skyshift-demo`) NO contiene a WISE 0855 (posición de 2010): no usarla.
- Ciclo 1 (rama `docs/arquitectura-observation`): **borrador** `docs/specs/0001-arquitectura-observation.md` (flujo de datos, `Observation` propuesto, matriz de interfaces, fallos). Johann lo propone; roles y contrato **sin ratificar**. Falta la revisión de Mateo y Daniel, de Sebastián (requisitos científicos) y de Dax (frontera `Region`).
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`; `WCS-WAVE` es aproximación para selección según D12 §2.2. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo: borrador `docs/specs/0010-analysis-result.md` (`AnalysisResult`), alineado con `Observation` 0001; rama `docs/analysis-measurements`. Para cerrarla faltan los umbrales de Sebastián y la revisión de Johann. Rango de fichas de Mateo: 0010–0019.

- Pitch (Johann): presentación ES de 7 diapositivas como Artifact (fuera del repo), ya con el nombre **Copernix**, su logo, la captura real de Epsilon Indi B y el método/semáforo de la app (v10, 14-nov noche). La demo usa solo Epsilon Indi B: Copernix aún afirma cambios no medidos en los otros cuatro objetos (`explain-i18n.ts`). Faltan versión en inglés, los dos PDF, revisar animaciones, URL de la demo y que Sebastián fije la cifra (6,6″ o 6,05″). Guion hablado y 3 actos (15-nov): `docs/pitch/guion-es.md`; deck en v18 con la demo en vivo entre las diapositivas 4 y 5. Detalle y enlace: `docs/pitch/pitch.md`.
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`, no `WCS-WAVE`. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo (rol: movimiento y brillo; PR #8): **primera entrega = movimiento de ε Indi B como candidato**, nunca "evaluado"; brillo a la 2.ª entrega; números del anexo B pendientes de recalcular (0010 §0, condiciones de Sebastián). ADR 0010 aceptado (Dax, Johann). Resultado como JSON estático en `frontend/public/demo/` (Dax, Daniel, Johann). Falta la **aprobación humana de la ficha 0010** para programar; la prueba χ² se reutiliza de `science/validation.py`.
- Mateo (rama `feat/measurement-motion`, PR #11): movimiento de ε Indi B implementado con los controles de Sebastián (0034): registro con 15 estrellas Gaia (dispersión 0,16″/0,21″ por eje, se sostiene el 0,3″), sin vecinas a < 3 px, pendiente con λ compatible con 0 (Ba/Bb), sensibilidad por pasada ≤ 0,16″/año. μ = (3,907; −2,476) ± 0,062″/año frente a Gaia (3,982; −2,467). Sigue como **candidato** (`threshold_exceeded_unverified`, techo OBSERVADO). Evidencia para su checklist: `docs/reviews/measurement/`. Falta: que Sebastián audite los `unknown`, que Daniel lo muestre en la UI y la recuperación inyectada (0034 §2).
- Mateo (rama `feat/measurement-pair-controls`): respuesta a 0036 de Sebastián en `docs/reviews/measurement/epsilon-indi-b-par-0036.md`. FLAGS limpios en la posición medida y en la ventana del ajuste de A/B; Q > 28,74 incluso con ρ = −1 entre fechas (99,4); correlación entre exposiciones ≈ 0; inyección sobre fondos reales: errores honestos en el núcleo (1,4× a SNR 100) pero 5,7 % de capturas en este campo denso; `CWAVE`/`CBAND` vinculados; sesgo de Ba/Bb en el par ≤ 0,0003″. Sigue como candidato.
- Rama `docs/observation-schema`: borrador verificable del contrato en `contracts/` (schema de `Observation`, schema del manifiesto offline, ejemplo real DR1 y sintéticos). `mise run check-contracts` lo valida sin red. Agrega la regla de IDs (probada con 906 filas reales) y los códigos cerrados. Responde a 0010 anexo E: la λ de una medición la lee `AnalysisResult` en el píxel medido, y `spectral.local` queda para un punto de referencia. Sigue en **borrador** hasta que lo revisen Mateo, Daniel y Sebastián.
- **Copernix** (nombre de la plataforma; NA ZA = equipo): landing en `landing/` + visor propio en `frontend/copernix/` (UI de la landing sobre la plataforma; ADR 0009) + API, en un solo origen: `mise run copernix-build` y `mise run copernix` → http://localhost:4410 (`/` landing, `/viewer/`, `/api`). Solo landing: `mise run landing`. Pendiente: revisión visual humana y probar el mapa WebGL2 en la GPU Intel real (hubo un GPU HANG; ver ADR 0007/0009).
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
- Ver la línea «Pitch (Johann)» de arriba y `docs/pitch/pitch.md` (enlace, estado, pendientes). Línea de IA ya añadida en `docs/AI_USAGE.md`.

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

## Sesión Codex · landing y estabilidad · 2026-11-14
- Rediseño de pitch aplicado: dos ilustraciones IA nuevas, imagen oficial de SPHEREx, ES/EN, vista clara y demo accesible.
- Journal confirma GPU HANG Intel i915 en Chrome; se retiraron WebGL automático, fondo continuo y backdrop blur. Driver sin modificar.
- Render bajo demanda, playback explícito ≤20 fps, pausa al ocultar/salir, canvas ≤0,9 MP; validación en navegador con GPU desactivada.
- Evidencia y capturas: docs/landing/2026-11-14-stability.md. Pendiente: revisión humana del diseño/ciencia; visor real todavía en desarrollo.

## Restauración solicitada por Daniel · 2026-11-14
- Rediseño premium revertido: estructura, imágenes, textos, estilos y scroll originales restaurados.
- Satélite original prerenderizado por CPU, con giro y arrastre sin WebGL; hasta 8 imágenes decodificadas.
- Render acotado, fondo animado conservado, pausa oculta y blur desactivado; controlador i915 sin modificar.
- Verificación y capturas actuales: docs/landing/2026-11-14-restored.md; sustituye la revisión visual anterior.

- Sección método reestructurada por solicitud de Daniel: comparativa protagonista, recorrido abierto de cuatro pasos y evidencia separada; resto del scroll intacto.

- Ajuste solicitado: objetos alternados, hero letra por letra y escenas activas con intervalo de 33 ms; telescopio interpolado sin WebGL. Tests, lint, build y smoke de navegador aprobados; revisión humana pendiente.

- Ajuste visual: método centrado completo y alternancia de objetos continua entre grupos (izquierda/derecha/izquierda/derecha/izquierda).

- Fluidez: RAF sincronizado hasta ~60 Hz en telescopio/demo con reducción por coste CPU; menos escrituras de scroll y paquetes por transform. 10 tests, lint, build y smoke sin GPU aprobados.

- Hero sin imagen propia; fondo compartido y escenas sincronizados a ~60 Hz. Nubes a resolución 1/4 por eje para reducir coste; pausa oculta y modo reducido conservados. Tests/lint/build/smoke aprobados.
