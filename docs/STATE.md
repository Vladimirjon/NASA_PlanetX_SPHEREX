# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, tarde (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- Fase: **investigación y estándares** (sin código de producto todavía).
- Contexto para agentes listo: `AGENTS.md`, `docs/context/00–05`, `docs/GLOSARIO.md`, 14 skills en `.agents/skills/`.
- Investigación hecha: reto + rúbrica oficial (01), ciencia simple (02), APIs medidas en vivo (03), UX y competidores (04), estándares de agentes (05).
- Segunda ronda: skills re-elegidas por evidencia (ADR 0005), toolchain mise+uv+pnpm para Fedora/Windows (ADR 0004, `08`), stack propuesto (ADR 0003, `06`), norma UI anti-slop (`07`).
- Guía de onboarding del equipo integrada en AGENTS.md (decisiones acordadas, semáforo, ficha de tarea).
- Siguiente: el equipo lee onboarding + 01–04 + 07 y decide visión, stack (ADR 0003) y roles. Cada persona instala mise (`08` §1).
- Plan anterior del 13-nov archivado en `docs/archive/v0-2026-11-13/` (no es fuente de verdad).
- Ciclo 1 (rama `docs/arquitectura-observation`): **borrador** `docs/specs/0001-arquitectura-observation.md` (flujo de datos, `Observation` propuesto, matriz de interfaces, fallos). Johann lo propone; roles y contrato **sin ratificar**. Falta la revisión de Mateo y Daniel, de Sebastián (requisitos científicos) y de Dax (frontera `Region`).
- Contrastado con un producto DR1 real: el tiempo de la cabecera es UTC; `obs_id` no distingue detector ni versión; `em_min/em_max` cubren el detector entero; λ científica = `CWAVE`/`CBAND`, no `WCS-WAVE`. Esto contradice `context/03` §3 y `context/06` §5.2, que aún no se corrigen.
- Mateo: ficha `0010` (`AnalysisResult`) en `main`, **borrador** (falta aprobación de Sebastián y Johann). Preparados sin código: plan TDD `0011` y ADR `0010` (stack Python/uv, versiones fijadas). Bloqueos: umbrales de Sebastián; carpeta y `spectral.local` con Johann. Rango de Mateo: 0010–0019.

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
- [medido 14-nov, Mateo] Épocas DR1+QR3: WISE 0855 3 (QR3 vacío), Barnard 3, ε Indi B 4, RW Aur 3, R Dra 4. Detalle: `docs/specs/0010-analysis-result.md` anexo B. ε Indi B resuelto con 2MASS (IRSA Gator) sin SIMBAD.
- [medido] Barnard, RW Aur y R Dra **saturan** SPHEREx; WISE 0855 es demasiado débil en una exposición (SNR ≤ 4,7). Solo ε Indi B es medible (movimiento ~1 px en 1,4 años, medido). Falta una variable no saturada → Sebastián.
- IRSA TAP muy lento hoy (315 s / 502): usar SIA2.
- 14-nov tarde, comprobado (ficha 0001 §7.4): QR3 está vacío en WISE 0855, pero añade fechas posteriores a DR1 en Barnard, RW Aur y R Dra. WISE 0855 tiene 3 grupos de fechas en DR1 y un par D3 may-2025/may-2026 con la misma λ en el punto (candidato, sin evaluar). IRSA da 502 intermitentes, con o sin `TIME`. ~~Pendiente: resolver Epsilon Indi B cuando SIMBAD vuelva.~~ Resuelto (ficha 0010). Ojo: WISE 0855 no se detecta en una exposición (ficha 0010 B.4), así que ese par D3 no es medible.

## Preguntas para mentores (Bloque 4)
- Duración exacta del pitch y del Q&A.
- (agregar)
