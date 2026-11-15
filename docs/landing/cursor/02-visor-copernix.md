# Encargo 2 · Visor Copernix (UI nueva sobre la plataforma)

Carpeta tuya: **`frontend/copernix/`** (nueva) más `frontend/vite.copernix.config.ts`, `frontend/tsconfig.json` (solo para incluir la carpeta) y `frontend/package.json` (solo scripts nuevos). **No cambies** `frontend/src/app/**`, `frontend/src/ui/**`, `frontend/src/engine/**`, ni `index.html`/`series.html` del producto actual: siguen funcionando con sus tests.

## Objetivo
Un visor interactivo con **otra interfaz**: la del repo (`src/app/components`, `app.css`) no se reutiliza. La UI nueva se diseña desde la landing para que quien viene de ella no sienta un cambio de producto: mismos tokens, tipografías, vidrio, chips de texto, botón blanco, ayudas «?», ES/EN, semáforo. Reutiliza **solo lógica sin UI**: `src/app/core/*` (targets, search, url-state, timeline, progress), `src/app/ports` + `adapters/engine-map-controller.ts`, `src/series/**` (core + adapters api/demo/fallback + canvas-renderer) y el motor por su API pública.

## Arquitectura (ya decidida)
- Entrada propia: `frontend/copernix/index.html` + `frontend/copernix/src/main.tsx` (React 19, ya instalado). Configuración `frontend/vite.copernix.config.ts` con `root: copernix`, **`base: '/viewer/'`**, `build.outDir: ../dist-copernix` (`emptyOutDir`), proxy `/api` → `VITE_API_PROXY ?? http://127.0.0.1:8000` (igual que `vite.config.ts`), `server.fs.allow` para importar `../src/**`.
- Scripts en `package.json`: `dev:copernix` (`vite -c vite.copernix.config.ts`), `build:copernix` (`tsc --noEmit && vite build -c vite.copernix.config.ts`). `pnpm lint` y `pnpm test` existentes deben seguir pasando (añade `copernix` a `include` de tsconfig/eslint si hace falta).
- Estilos propios: `frontend/copernix/src/styles/tokens.css` (copia de `:root` de `landing/css/styles.css`; comentario «mantener sincronizado con landing») y `viewer.css`. Fuentes: copia los `.woff2` de `landing/fonts/` a `frontend/copernix/public/fonts/` y declara `@font-face` con ruta relativa a la base. No uses `@fontsource/ibm-plex-*` en esta UI.
- i18n ES/EN propio y pequeño (`copernix/src/i18n.ts`), idioma inicial por `?lang=`, luego `localStorage` y luego `navigator.language`, igual que la landing (`landing/js/app.js`, bloque «idioma»). Respeta `?lang=` de la URL de entrada.
- URL como estado (reutiliza `app/core/url-state.ts`): `?target=` | `?ra=&dec=&fov=&plane=&t=&mode=&proj=`. Sin parámetros: abre en WISE 0855 con el mismo ejemplo que muestra la landing.

## Pantalla (una sola, sin ruido)
1. **Barra superior** idéntica en espíritu al menú de la landing (vidrio opaco, marca «Copernix» que enlaza a `/`, selector ES/EN, botón blanco «Volver al inicio» no; solo el enlace de marca). Sin rail de puntos.
2. **Mapa del cielo** a pantalla completa (el motor), sobre el fondo `#030e22`. Marcador del objetivo: punto blanco + anillo fino violeta (como `mark()` de `landing/js/app.js`), sin glow. Gestos del motor tal cual; teclas ± para zoom si el motor lo expone.
3. **Selector de objetivos**: los 5 del reto como **chips de texto sin recuadro** (activo subrayado `#428bca`), más un buscador (reutiliza `app/core/search.ts`; entrada de coordenadas RA/Dec en grados o sexagesimal) con la ayuda «?» de «RA y Dec».
4. **Dock inferior de vidrio** (como `.use-dock` de la landing): reproducir/pausar, línea de tiempo con las pasadas reales (`app/core/timeline.ts`), modo **Bucle / Diferencia / Color** (texto, sin cajas), banda espectral con la **escala de barras** de tono magenta→ámbar de la landing (sección «colors»), proyección y zoom en un menú discreto.
5. **Panel «¿Qué cambió?»** (vidrio opaco, lateral o sobre el dock): explicación en lenguaje simple generada con `series/core/explain.ts`, **semáforo Observado/Evaluado/Confirmado** y procedencia visible (archivo, fecha, banda/λ, colección) — nunca una imagen sin sus metadatos. Un enlace «Cómo lo calculamos» hacia `/#method`.
6. Estados: cargando (texto, sin spinner decorativo), sin red / API caída (usa la fuente demo `frontend/public/demo/` y rotúlala «demo sin conexión»), objetivo sin series, errores de URL (`kind: 'invalid'`).
7. Móvil: dock colapsable, objetivos en una fila con scroll horizontal, mapa táctil. Pantallas ≥ 360 px sin desborde horizontal.

## Rendimiento y seguridad de la GPU
El motor usa WebGL2 con `requestAnimationFrame`. No lo modifiques; solo evita trabajo extra de tu lado: nada de animaciones CSS continuas, nada de `backdrop-filter`, un solo `requestAnimationFrame` propio como máximo y solo mientras reproduce. Documenta en `frontend/copernix/README.md` que en la GPU Intel de Daniel conviene probarlo con cuidado y cómo desactivar el mapa (`?map=off` muestra solo el panel de serie).

## Verificación
`pnpm lint`, `pnpm test`, `pnpm build:copernix` en `frontend/`. Para una captura: arranca la API (`uv run --directory backend uvicorn --factory skyshift.api.app:create_app --port 8000`) y `pnpm dev:copernix`, abre `http://127.0.0.1:5173/viewer/?target=wise-0855` con Chrome `--disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader`, guarda capturas en `docs/landing/copernix-qa/` (ES y EN, escritorio y móvil). Escribe `frontend/copernix/README.md` (qué reutiliza, qué es nuevo, cómo correr).
