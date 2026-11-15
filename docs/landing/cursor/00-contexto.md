# Contexto compartido para todos los encargos (Cursor)

Eres un agente de implementación. Orquesta Claude Code (otra sesión); las decisiones de producto y de diseño ya las tomó Daniel (ver «Reglas de diseño»). No las reabras: ejecútalas.

## Qué es esto
- La plataforma se llama **Copernix**. **NA ZA** es el nombre del equipo (Space Apps 2026), no del producto. «SkyShift» fue el nombre provisional del repo: en la UI nueva no aparece.
- Repo: `/datos/VSCODE/NASA/NASA_PlanetX_SPHEREX`, rama `ui-ux-dflores`. **No hagas commit, push ni cambies de rama.** No toques `main`.
- Lee primero `AGENTS.md`, `docs/STATE.md`, `docs/context/07-estandar-ui.md`, `frontend/AGENTS.md` y `landing/README.md`.
- `landing/` es una página **estática sin build** (HTML + CSS + ES modules, ES/EN) ya diseñada. `frontend/` es la plataforma (React 19 + Vite + motor de cielo WebGL2 propio) y `backend/` la API (FastAPI) en `127.0.0.1:8000`.
- Herramientas ya instaladas en `~/.local/bin` (usa `export PATH=$HOME/.local/bin:$PATH`): `uv 0.13.8`, `pnpm 12.18.0`; `frontend/node_modules` y `backend/.venv` ya están listos. Node 22.

## Reglas de diseño (de Daniel, no negociables)
- Paleta: `#000000 #888888 #15418C #428BCA #FFFFFF` y la escala NASA `#105bd8 #0b3d91 #061f4a #212121 #323a45 #aeb0b5`. Fondo `#030e22`. Acento único `#428bca`. **Morado `#a78bfa` solo en detalles** (punto activo, círculos de pasos, anillo de marcador). **Nada de amarillo.**
- **Sin neon, sin glow, sin halos, sin sombras de color**, sin «soles». Visualización monocromática azul; la **escala de bandas espectrales conserva su degradado de tono magenta→ámbar** (único lugar con color).
- **Sin efecto linterna/spotlight al pasar el mouse.** Superficies de **vidrio**: degradado translúcido + borde fino + brillo interno de 1 px, **sin `backdrop-filter`** (provocó un cuelgue de GPU Intel i915; `scripts/check-landing.mjs` lo prohíbe). Los paneles de lectura (tooltips, menús) son **opacos** (`rgba(…,.97)`), nunca casi transparentes.
- Rótulos pequeños y discretos; **chips y botones secundarios sin recuadro** (texto con subrayado en el activo). Botón principal: blanco sólido con texto oscuro.
- Tipografía: Bricolage Grotesque (display) e IBM Plex Mono (datos), autoalojadas (`landing/fonts/`). Radios: 6 px controles, 14 px vidrio.
- Ayudas «?»: botón circular que abre una caja opaca (ver `.tip` y `#tipbox` en `landing/css/styles.css`).
- Respeta `prefers-reduced-motion` y el teclado; contraste AA; táctil ≥ 44 px donde sea una acción principal.
- Copia y cifras: lenguaje simple (público sin astronomía). Semáforo obligatorio **Observado / Evaluado / Confirmado**; nunca «Confirmado» por software. Datos reales o demo rotulada; nada inventado.

## Restricciones de ejecución
- **Nunca abras WebGL para tareas del propio agente** y no ejecutes navegadores con GPU real en pruebas: usa `--disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader` (la máquina de Daniel tuvo un `GPU HANG` Intel i915).
- No modifiques `frontend/src/engine/**` ni `frontend/src/ui/**` (otro dueño). Usa solo la API pública del motor (`createSkyEngine`, `setView`, `getView`, `setPlane`, `setProjection`, `on`, `destroy`).
- Sin secretos, sin dependencias nuevas salvo justificación de una línea; versiones exactas.
- Verifica antes de decir «listo»: muestra la salida de lint/tests/build que aplique.
- Anota tu trabajo en `docs/AI_USAGE.md` (una línea: herramienta «Cursor CLI», qué hiciste, qué debe revisar un humano).
