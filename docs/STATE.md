# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, tarde (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- Ciencia: funciones offline y vista local de dos pares reales en `science/` y `science_preview/`; ningún caso está evaluado. Faltan integración y validación de campo con Johann/Mateo.
- Ciencia: `docs/specs/0032-criterios-cuantitativos-validacion.md` separa límites IRSA de R6/R11/R12 provisionales de la rama de Mateo; ningún par se declara validado.
- Ciencia: comprobados con WCS los píxeles de las posiciones hipotéticas en ambos recortes; no se identifica aún WISE 0855. Fuentes y pasos manuales en ficha 0031.
- Ciencia: exploración real de recortes y calibración del par D3 en `docs/specs/0031-controles-wise-0855.md`; posición de fuente sin confirmar y controles aún `pending`.
- Ciencia: `docs/specs/0031-controles-wise-0855.md` registra dos imágenes DR1 D3 y fechas reales; detección, λ en la fuente, alineación y calidad local pendientes.
- Ciencia (rama `scientific-rules`): ficha `docs/specs/0030-validacion-interpretacion-cientifica.md` en borrador; revisar con Johann/Mateo y validar un par real antes de implementación.
- Responsabilidades confirmadas por el usuario: Dax (región), Johann (datos), Mateo (mediciones), Sebastián (ciencia), Daniel (UX/UI); el detalle de carpetas aún no está asignado.
- Fase: **investigación, estándares y primer prototipo local de validación científica**.
- Contexto para agentes listo: `AGENTS.md`, `docs/context/00–05`, `docs/GLOSARIO.md`, 14 skills en `.agents/skills/`.
- Investigación hecha: reto + rúbrica oficial (01), ciencia simple (02), APIs medidas en vivo (03), UX y competidores (04), estándares de agentes (05).
- Segunda ronda: skills re-elegidas por evidencia (ADR 0005), toolchain mise+uv+pnpm para Fedora/Windows (ADR 0004, `08`), stack propuesto (ADR 0003, `06`), norma UI anti-slop (`07`).
- Guía de onboarding del equipo integrada en AGENTS.md (decisiones acordadas, semáforo, ficha de tarea).
- Siguiente: el equipo lee onboarding + 01–04 + 07 y decide visión, stack (ADR 0003) y roles. Cada persona instala mise (`08` §1).
- Plan anterior del 13-nov archivado en `docs/archive/v0-2026-11-13/` (no es fuente de verdad).
- Ciclo 1: **borrador** `docs/specs/0001-arquitectura-observation.md` (flujo de datos, `Observation` propuesto, matriz de interfaces, fallos). Los roles fueron confirmados después; el contrato de Johann sigue pendiente de revisión de Mateo, Daniel, Sebastián y Dax.
- Pitch (14-nov tarde): presentación ES de 7 diapositivas hecha como Artifact (fuera del repo), con fotos reales de NASA y el guion en las notas. Faltan animaciones por afinar, la versión en inglés, los dos PDF, el nombre y las capturas de la app. Detalle y enlace: `docs/HANDOFF_PITCH.md`.
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`, no `WCS-WAVE`. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo: ficha `0010` (`AnalysisResult`) en `main`, **borrador** (falta aprobación de Sebastián y Johann). Preparados sin código: plan TDD `0011` y ADR `0010` (stack Python/uv, versiones fijadas). Criterios provisionales de Sebastián (14-nov) incorporados: R6 Δλ/min(CBAND) ≤ 0,02 (solo ε Indi B), SNR ≥ 5, ≥ 5σ con covarianza; ε Indi B = candidato (falta C1–C7). Pendiente: carpeta con Johann y la ficha de Sebastián. Rango de Mateo: 0010–0019.
- Rama `docs/observation-schema`: borrador verificable del contrato en `contracts/` (schema de `Observation`, schema del manifiesto offline, ejemplo real DR1 y sintéticos). `mise run check-contracts` lo valida sin red. Agrega la regla de IDs (probada con 906 filas reales) y los códigos cerrados. Responde a 0010 anexo E: la λ de una medición la lee `AnalysisResult` en el píxel medido, y `spectral.local` queda para un punto de referencia. Sigue en **borrador** hasta que lo revisen Mateo, Daniel y Sebastián.

## Hitos (Ecuador, UTC−5)
| Hora | Hito |
| --- | --- |
| Sáb (hoy) | Decidir visión, stack y roles → ADRs |
| Dom 02:00 | Congelación de features |
| **Dom 09:00** | **Entrega local: repo público + LICENSE, demo pública, slides ≤7, ficha ES/EN** |
| Dom 11:00 | Pitch en español + Q&A |
| Dom 23:59 | Cierre global |

## Dueños (detalle de carpetas pendiente; roles confirmados en «Ahora»)
| Persona | Rol | Carpetas |
| --- | --- | --- |
| Dax | Región | Por acordar |
| Johann | Datos e integración | Por acordar |
| Mateo | Mediciones | Por acordar |
| Sebastián | Validación e interpretación científica | Por acordar |
| Daniel | UX/UI | Por acordar |

## Decisiones pendientes (del equipo, no de la IA)
1. Visión de producto y "momento wow" (ver `docs/context/04-vision-ux.md`).
2. Stack: el de ADR 0003 es solo recomendación; cada dueño de módulo decide con su agente y deja ADR. Elegir el hosting del backend (Cloud Run pide tarjeta; HF Spaces no).
3. Detalle de responsabilidades, carpetas y dependencias entre módulos.
4. Nombre de la app (provisional: SkyShift).

## Bloqueos y riesgos
- [medido 14-nov, Mateo] Épocas DR1+QR3: WISE 0855 3 (QR3 vacío), Barnard 3, ε Indi B 4, RW Aur 3, R Dra 4. Detalle: `docs/specs/0010-analysis-result.md` anexo B. ε Indi B resuelto con 2MASS (IRSA Gator) sin SIMBAD.
- [medido] Barnard, RW Aur y R Dra **saturan** SPHEREx; WISE 0855 es demasiado débil en una exposición (SNR ≤ 4,7). Solo ε Indi B es medible (movimiento ~1 px en 1,4 años, medido). Falta una variable no saturada → Sebastián.
- IRSA TAP muy lento hoy (315 s / 502): usar SIA2.
- 14-nov tarde, comprobado (ficha 0001 §7.4): QR3 está vacío en WISE 0855, pero añade fechas posteriores a DR1 en Barnard, RW Aur y R Dra. WISE 0855 tiene 3 grupos de fechas en DR1 y un par D3 may-2025/may-2026 con la misma λ en el punto (candidato, sin evaluar). IRSA da 502 intermitentes, con o sin `TIME`. ~~Pendiente: resolver Epsilon Indi B cuando SIMBAD vuelva.~~ Resuelto (ficha 0010). Ojo: WISE 0855 no se detecta en una exposición (ficha 0010 B.4), así que ese par D3 no es medible.

## Preguntas para mentores (Bloque 4)
- Duración exacta del pitch y del Q&A.
- (agregar)
