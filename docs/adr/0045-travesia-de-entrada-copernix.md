# 0045 · Travesía de entrada 3D dentro de Copernix

- Estado: aceptada
- Fecha: 2026-11-15
- Decidido por: Dax (pedido explícito); UI base de Daniel sin cambios

## Contexto
La vista «Universo» de la spec 0045 (`backup/universe-discarded`, `feat/phase0-foundations`) era una app aparte con su propia UI (barra de niveles, buscador, capas) que choca con la UI final de Daniel. Dax pidió una transición: al pulsar «Explore the sky», ver SPHEREx en 3D sobre la Tierra, alejarse hasta el Sol y la Vía Láctea, y fundirse con el cielo real del visor.

## Opciones consideradas
1. Fusionar la app `frontend/universe/` (11 k líneas, otra UI) — contra: rompe la UI de Daniel y duplica navegación.
2. Travesía cinemática corta dentro del visor Copernix, cargada de forma diferida — pro: respeta la UI, una sola app; contra: no es interactiva.

## Decisión
Opción 2: `frontend/copernix/src/journey/` (three.js 0.187, chunk diferido), activada con `?journey=1` desde los CTA de la landing; termina mirando al centro galáctico, el mismo punto donde abre el globo del visor, y se funde con él.

## Consecuencias
- Posiciones reales para «ahora» (Sol, rotación terrestre, órbita de 700 km); los halos del Sol/Tierra son ayuda visual y se rotulan.
- Reutiliza el modelo de la landing (`/model/`) y texturas de dominio público de NASA (créditos en `frontend/copernix/public/journey/CREDITS.md`).
- La landing precarga en reposo el visor y los assets (`landing/js/prefetch.js`); el visor precarga las 5 series destacadas (`prefetch-source.ts`).
- Sin WebGL2 rápido, con movimiento reducido o `?map=off`, no se reproduce. El renderer se destruye al terminar (GPU Intel, ADR 0007).
- `frontend/universe/` no entra a `main`; queda en las ramas de respaldo.
