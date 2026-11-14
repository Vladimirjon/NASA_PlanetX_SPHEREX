# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, tarde (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- 14-nov ~16:45: analizador con dominio + SIA2 + lector FITS S3 + BuildSeries escritos (102 tests); FALTA test de punta a punta de BuildSeries, endpoints /series y /frames, prueba con los 5 objetos. Revisores del visor: R2 UX y R4 ciencia = CAMBIOS REQUERIDOS (B: cielo en espejo, este a la derecha; texto <16 px; sin botones táctiles); R1 y R3 en curso. Informes en rama feat/sky-engine docs/reviews/sky-engine/.
- Mapa de datos físico listo (`docs/context/12`): reglas de pasadas (>45 d), tolerancia λ/(4R), máscara FLAGS, propagación de movimiento propio. **La demo vieja de WISE 0855 no contiene a WISE 0855** (posición de 2010) y sus pares no son comparables en λ: no usarla en el pitch.
- Backend hexagonal con caché por capas y proxy HiPS (53 tests); visor propio dibuja (rama `feat/sky-engine`, en revisión). Ficha 0002 v2 espera aprobación.
- **Fase 0 (bases)** en rama `feat/phase0-foundations`: ADR 0006 (dos pistas, caché local→IRSA, Rust/Redis solo si se mide), `contracts/openapi.yaml` v0.1 válido, fichas 0002 (analizador) y 0003 (visor propio, sin Aladin) en borrador; agente físico redacta `docs/context/12`.
- Datos reales medidos hoy (SIA2): QR3 **sí** tiene datos de Barnard, Eps Indi B, RW Aur y R Dra (ago–oct 2026); WISE 0855 solo DR1. Cada objeto tiene 3–6 pasadas en 13–17 meses.
- Inventario y brecha frente a IRSA: `docs/context/11-inventario-prototipos-y-brecha-irsa.md`; sin paridad visual ni científica demostrada.
- Globo celeste experimental propio en `~/Desktop/skyshift-demo/visor-propio.py` (puerto 8767): arrastre, rueda y HiPS órdenes 3–4; faltan orden 5 y serie temporal.
- Prototipo local de mapa HiPS en `~/Desktop/skyshift-demo/mapa.html`: navegación, λ y celda; usa teselas en línea; comparación temporal para otras regiones pendiente.
- Cuadrícula DR1 reproducible: `mise run grid-spherex` y `mise run grid-test`; geometría de 12.288 celdas, datos espectrales y visor aún no incluidos.
- Protocolo experimental HiPS: `docs/context/10-protocolo-hips-reproducible.md`; 4 millones de posiciones comparadas sin discrepancias; un cubo FITS descargado y verificado; índice temporal y visor pendientes.
- Índice experimental HiPS: 12.288 celdas geométricas fuera del repo; cubos agregados, no índice temporal; detalles en `docs/context/09-referencia-irsa-exploracion.md`.
- Exploración de todo el cielo y análisis de IRSA: `docs/context/09-referencia-irsa-exploracion.md`; ficha base aprobada por Dax `docs/specs/0001-exploracion-cache-borrador.md`. WISE es un ejemplo, con validación pendiente.
- Fase: **investigación y estándares** (sin código de producto todavía).
- Contexto para agentes listo: `AGENTS.md`, `docs/context/00–05`, `docs/GLOSARIO.md`, 14 skills en `.agents/skills/`.
- Investigación hecha: reto + rúbrica oficial (01), ciencia simple (02), APIs medidas en vivo (03), UX y competidores (04), estándares de agentes (05).
- Segunda ronda: skills re-elegidas por evidencia (ADR 0005), toolchain mise+uv+pnpm para Fedora/Windows (ADR 0004, `08`), stack propuesto (ADR 0003, `06`), norma UI anti-slop (`07`).
- Guía de onboarding del equipo integrada en AGENTS.md (decisiones acordadas, semáforo, ficha de tarea).
- Siguiente: el equipo lee onboarding + 01–04 + 07 y decide visión, stack (ADR 0003) y roles. Cada persona instala mise (`08` §1).
- Plan anterior del 13-nov archivado en `docs/archive/v0-2026-11-13/` (no es fuente de verdad).

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
- IRSA TAP muy lento hoy (315 s / 502): usar SIA2.

## Preguntas para mentores (Bloque 4)
- Duración exacta del pitch y del Q&A.
- (agregar)
