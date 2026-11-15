# 0006 · Landing estática sin build (HTML + CSS + módulos JS)

- Estado: **propuesta** (la decisión de producto es del equipo; este ADR documenta lo construido)
- Fecha: 2026-11-14
- Decidido por: Daniel (UI/UX)

## Contexto
La landing cuenta la historia (el cielo cambia → imágenes reales de SPHEREx → cómo se encuentra un cambio → pruébalo) y enlaza al visor, que aún no existe. Debe correr igual en Fedora y Windows, abrirse sin cuenta ni build y no depender de CDNs en la demo.

## Opciones consideradas
1. React + Vite dentro de `frontend/` — encaja con el stack propuesto (ADR 0003) pero acopla la landing al visor y exige build antes de mostrarla.
2. **Carpeta `landing/` estática**: `index.html`, `css/`, `js/` (módulos ES), three.js y fuentes copiados en el repo. Sin build, sin npm.
3. Un solo HTML con todo incrustado (como el boceto) — difícil de mantener y de revisar en PR.

## Decisión
Opción 2. Servida con `mise run landing` (`scripts/serve_landing.py`, sin caché) en http://localhost:4410. Las imágenes generadas con IA entran por `landing/assets/manifest.json` y se preparan con `scripts/prepare_landing_images.py` (recorte, marca de agua, WebP; usa Pillow).

## Consecuencias
- Sin dependencias de runtime externas: three.js r-vendored en `landing/lib/`, fuentes (OFL) en `landing/fonts/`.
- Cuando exista el visor, se pone `VIEWER_READY = true` en `landing/js/app.js` y los botones enlazan a `viewer/` (hoy muestran un aviso en vez de un 404).
- Si el equipo prefiere React, `landing/js/i18n.js` y los tokens de `landing/css/styles.css` se reutilizan tal cual.
- Pendiente de decisión del equipo: tema claro de alto contraste (norma 07 §3) y IBM Plex Sans en lugar de Bricolage Grotesque. La norma 07 también prohíbe el vidrio, las nubes y las estrellas animadas que esta landing usa por decisión de Daniel (UI/UX).
