# Copernix viewer (`/viewer/`)

UI nueva del producto **Copernix**, alineada visualmente con `landing/`. No reutiliza `src/app/components` ni `app.css`.

## Qué reutiliza

- `src/app/core/*` — targets, search, url-state, timeline, progress
- `src/app/ports` + `adapters/engine-map-controller.ts`
- `src/series/**` — explain, blink, difference, colour, stretch, canvas-renderer, Api/Demo/Fallback
- Motor WebGL2 por API pública: `createSkyEngine`, `setView`, `getView`, `setPlane`, `setProjection`, `zoomBy`, `on`, `destroy`

## Qué es nuevo

- Entrada `copernix/index.html` + React en `copernix/src/`
- Tokens/tipografías de la landing (`styles/tokens.css`, `public/fonts/`)
- i18n ES/EN propio (`i18n.ts`) + `explain-i18n.ts`
- Layout editorial (scrim, columna izquierda, recorte, dock delgado)
- **Catálogo abierto** (`catalog/`): puerto `CatalogSource`, destacados locales + `GET /api/v1/search` con debounce/cancelación; tipos SIMBAD → etiquetas amables; URL `?name=` para no destacados (`name-url.ts`)
- Controles en lenguaje simple (modos, tipo de luz, línea de tiempo, zoom, guía de 3 pasos)
- Selección en `selection.ts`: marcador anclado; candidato; `named` para hits del buscador

## Catálogo y backend

No hay endpoint para listar todo el catálogo: el buscador consulta `/search` bajo demanda. **Una lista navegable requeriría `GET /catalog` en la API** (sugerencia para quien mantiene el backend). No inventamos ese listado aquí.

## Modos de vista (verificados contra el código)

| Modo UI | Código | Qué hace |
| --- | --- | --- |
| Fotos en secuencia | `series/core/blink.ts` | Alterna fotogramas a ~1 Hz |
| Solo lo que cambió | `series/core/difference.ts` | Resta píxel a píxel B − A |
| Fechas en color | `series/core/colour.ts` | Magenta = primera visita, verde = última |

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

```bash
google-chrome --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader \
  "http://127.0.0.1:5173/viewer/?target=wise-0855"
```

Si el mapa cuelga: **`?map=off`** muestra solo el panel de serie.

## URL

`?target=` · `?name=` (objeto del catálogo) · `?ra=&dec=&fov=&plane=&t=&mode=&proj=` · `?lang=es|en` · `?map=off`  
Sin parámetros abre el destacado por defecto (mismo ejemplo de la landing).
