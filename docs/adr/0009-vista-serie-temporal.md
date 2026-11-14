# 0009 · Vista de serie temporal (frontend)

- Estado: aceptada
- Fecha: 2026-11-14
- Decidido por: orquestador (brief de implementación); ejecución en `feat/series-viewer`

## Contexto
El núcleo del reto es ver épocas SPHEREx de una región “como un video” y entender el cambio. El motor HiPS (`engine/`) es otra pista; hace falta una página aparte con datos Float32 reales.

## Opciones consideradas
1. Meter el blink en el motor WebGL2 — acopla a otro dueño y es overkill para 49×49.
2. Página `series.html` con capas ADR 0008 (core puro / puertos / adaptadores / React fino) + Canvas2D.
3. Solo notebooks/IRSA — no cumple UX pública ni deep links.

## Decisión
Opción 2: `frontend/src/series/` + `series.html`; tipos desde `openapi-typescript`; Demo + API con fallback; stretch asinh compartido; blink ≤ 2,5 Hz; semáforo solo OBSERVED/EVALUATED.

## Consecuencias
Gana: ciencia testeable sin red, demo offline de los 5 objetos, UI instrumentada. Cuesta: mantener dos entradas Vite. Extender: nuevo `SeriesSource` o modo de comparación sin tocar el core.
