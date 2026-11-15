# Copernix viewer (`/viewer/`)

UI nueva del producto **Copernix**, alineada visualmente con `landing/`. No reutiliza `src/app/components` ni `app.css`.

## Qué reutiliza

- `src/app/core/*` — targets, search, url-state, timeline, progress
- `src/app/ports` + `adapters/engine-map-controller.ts`
- `src/series/**` — explain, blink, stretch, canvas-renderer, Api/Demo/Fallback
- Motor WebGL2 por API pública: `createSkyEngine`, `setView`, `getView`, `setPlane`, `setProjection`, `zoomBy`, `on`, `destroy`

## Qué es nuevo

- Entrada `copernix/index.html` + React en `copernix/src/`
- Tokens/tipografías de la landing (`styles/tokens.css`, `public/fonts/`)
- i18n ES/EN propio (`i18n.ts`, clave `naza_lang`) + `explain-i18n.ts` (frases ES/EN con los mismos números; no edita `series/core/explain.ts`)
- Dock, chips de texto, semáforo, ayudas «?», marcador blanco + anillo violeta + nombre

## Cómo correr

```bash
# desde frontend/
pnpm install --frozen-lockfile
# API en 127.0.0.1:8000
pnpm dev:copernix
# → http://127.0.0.1:5173/viewer/?target=wise-0855
```

Build: `pnpm build:copernix` → `frontend/dist-copernix/` (base `/viewer/`).
Con la landing unificada: `mise run copernix-build` y `mise run copernix` → `http://127.0.0.1:4410/viewer/`.

### GPU Intel (i915)

En la máquina de Daniel conviene probar con Chrome sin GPU física:

```bash
google-chrome --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader \
  "http://127.0.0.1:5173/viewer/?target=wise-0855"
```

Si el mapa cuelga o no hay WebGL usable: **`?map=off`** muestra solo el panel de serie (sin motor).

## URL

`?target=` | `?ra=&dec=&fov=&plane=&t=&mode=&proj=` · `?lang=es|en` · `?map=off`  
Sin parámetros abre WISE 0855 (mismo ejemplo de la landing).
