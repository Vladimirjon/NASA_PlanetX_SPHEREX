# Píxeles ocultos en el recorte: prototipo de visualización

15-nov-2026 · Mateo + Claude Code · Rama local `feat/viewer-hidden-pixels` (sin commit) · **Prototipo para revisión de Daniel/Dax (UI) y Sebastián (textos).** No cambia datos, máscaras del backend ni el contrato.

## Problema

Los píxeles que el backend oculta (`NaN`: saturados, marcados en `FLAGS` o fuera del área útil) se pintaban **negros**, igual que el cielo vacío. Un centro saturado parecía «sin luz» cuando tiene demasiada. En «Fechas en color», un píxel oculto en una sola fecha se pintaba como 0 y aparecía magenta o verde puros, es decir, un **cambio inventado** (`before-rw-aurigae-dates.png`).

## Qué hace el prototipo

| Vista | Centro saturado | Otros píxeles ocultos | Leyenda |
| --- | --- | --- | --- |
| Por defecto, secuencia y fechas en color | Blanco con contorno fino | Casi negro (`18,20,25`) | «White centre: too bright for the detector (saturated), so it is not measured.» |
| Por defecto, solo lo que cambió | Blanco con contorno fino | Gris oscuro neutro (`66,70,78`), distinto del gris medio que significa «sin cambio» | Además: «Dark grey: no data in one of the two photos, so it is not a change.» |
| Capa experta («Show hidden pixels», en Detalles y procedencia) | Rayado + contorno | Rayado + contorno | Explicación completa de por qué se ocultan |

Nunca se rellena ni se interpola un píxel oculto; en «Fechas en color» un píxel oculto en cualquiera de las dos fechas queda oculto.

## Cómo se reconoce un centro saturado

El navegador no recibe el motivo de cada píxel oculto. Regla de **solo visualización** (`frontend/src/series/core/hidden.ts`, `BRIGHT_RIM_THRESHOLD = 0.7`): una mancha oculta es un centro saturado si la mediana del brillo en pantalla (0–1) de los píxeles visibles que la tocan es ≥ 0,7.

Se midió en las 5 regiones de demo (238 manchas, todos los cuadros):

- Centros de R Dra (3 visitas), Barnard (3) y RW Aur (visita 2): borde entre **0,76 y 1,00**.
- Todas las demás manchas: **0,67 o menos**; la mayoría ≤ 0,57.

Límites: es una regla aproximada sobre la imagen mostrada; con otras regiones puede fallar. La versión correcta es que el backend envíe una capa con el bit `OVERFLOW` de `FLAGS` (cambio de contrato: Johann y Dax). Ninguna medición usa esta regla.

## Evidencia

- `pnpm test` 193/193 (pruebas nuevas en `tests/series/hidden.test.ts` y `colour.test.ts`, escritas antes del código), `pnpm lint`, `pnpm build`, `pnpm build:copernix` y `d3-case-smoke.mjs`: OK.
- Capturas a 1440×900, sin API (datos grabados), vista ampliada del recorte:
  - `before-*`: `main` actual (negro).
  - `quiet-*`: vista por defecto del prototipo.
  - `expert-*`: capa experta (rayado).
  - `quiet-barnards-star-mobile.png` y `expert-barnards-star-mobile.png`: 375 px, sin scroll horizontal.
- Interruptor comprobado en el navegador: leyenda `saturated` → `hidden` al activarlo → `saturated` al desactivarlo.

## Pendientes y notas

- La tarjeta compacta anida botones dentro de un botón (aviso de React en consola); ya existe en `main`.
- En móvil la barra de reproducción tapa parte de la tarjeta; ya existe en `main`.
- El mapa grande (teselas HiPS de IRSA) no cambia.
- El patrón de la muestra en la leyenda usa `repeating-linear-gradient` como rayado funcional; revisar contra `docs/context/07-estandar-ui.md`.
