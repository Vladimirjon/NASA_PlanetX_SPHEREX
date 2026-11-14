# STATE — pizarra compartida

Actualizado: sáb 14-nov-2026, tarde (UTC−5). Regla: cada sesión de agente o reunión actualiza esto en ≤5 líneas.

## Ahora
- **Pista B / sky-engine** en `feat/sky-engine`: ronda 3 navegación Aladin-like — SIN máx. 180° (disco), sin auto-AIT; arrastre con punto bajo el puntero; zoom anclado + `flyTo`; inercia; tests + smoke GPU (p95 ~16,8 ms, 0 URL duplicadas).
- **Fase 0 (bases)** también en docs: ADR 0006, `contracts/openapi.yaml` v0.1, fichas 0002/0003; agente físico `docs/context/12`.
- Datos reales medidos (SIA2): QR3 **sí** tiene datos de Barnard, Eps Indi B, RW Aur y R Dra (ago–oct 2026); WISE 0855 solo DR1. Cada objeto tiene 3–6 pasadas en 13–17 meses.
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
