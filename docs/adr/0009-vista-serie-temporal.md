# 0009 · Vista de serie temporal e app integrada

- Estado: aceptada
- Fecha: 2026-11-14
- Decidido por: orquestador (brief ronda 1 + ronda 2); feedback producto Dax

## Contexto
El núcleo del reto es ver épocas SPHEREx “como un video” y entender el cambio. Tras la ronda 1 (página `series.html` aislada), el dueño de producto pidió un solo producto: mapa + 5 regiones de ejemplo + línea temporal + análisis, sin `<select>` nativos y con flujo suave.

## Opciones consideradas
1. Meter el blink en el motor WebGL2 — acopla a otro dueño; overkill para 49×49.
2. App única (`index.html`) con `frontend/src/app/**` que reutiliza `series/**`; fly-to por `MapController` que hace tween de `setView` (sin tocar `engine/**`).
3. Dos apps separadas mapa vs serie — no resuelve “dónde están las 5 regiones / la línea temporal”.

## Decisión
Opción 2. Capas ADR 0008. Timeout API 60 s (primer análisis 8–20 s); slug → nombre canónico antes de `/resolve`; motion al `/series`. `series.html` redirige al app. Semáforo solo OBSERVED/EVALUATED.

## Consecuencias
Gana: un flujo claro challenge → vuelo → timeline → cutout. Cuesta: shell nuevo que hay que mantener alineado con la API pública del motor. Extender: nuevo `SeriesSource` o `MapController` nativo con `flyTo` sin cambiar el shell.
