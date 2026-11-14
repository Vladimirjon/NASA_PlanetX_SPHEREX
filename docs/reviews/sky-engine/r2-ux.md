# R2 · Revisión UI/UX y accesibilidad del motor de cielo (track B)

**Veredicto: CAMBIOS REQUERIDOS**

- Rama `feat/sky-engine` @ `0e5126f`, worktree `NASA_PlanetX_SPHEREX-sky-engine`. Revisión de solo lectura (2026-11-14).
- Normas: `AGENTS.md` §4, §5, §7 · ficha `docs/specs/0003-visor-cielo-propio.md` · `docs/context/07-estandar-ui.md` (puerta §8) · `docs/context/04-vision-ux.md` §6 · ADR 0042. (No existe ADR 0041 en esta rama).
- Método: Vite en `127.0.0.1:5174`; Playwright 1.65.2 + Chromium 1228 (WebGL2 por SwiftShader/Vulkan); `axe-playwright-python`; contraste calculado con la fórmula WCAG sobre los colores computados; pellizco con eventos táctiles CDP; IRSA bloqueado con `page.route`. Skills aplicadas: `impeccable` (solo `audit`, nunca live), `web-design-guidelines`, `accessibility`.
- Capturas: `docs/reviews/sky-engine/r2/` (lista al final).

## Resumen

El visor **no tiene "AI slop"**: sobrio, Plex, un acento, radios de 3 px, sin gradientes ni adornos; el cielo es protagonista, el contraste pasa con holgura y axe solo reporta 1 aviso moderado. Pero **no cumple WCAG 2.2 AA** (zoom y desplazamiento dependen de gestos multipunto o de arrastre sin alternativa de un solo puntero), **no tiene estados de carga ni de error honestos** (lienzo negro sin texto al arrancar, 1,7 s de negro total al cambiar de banda, error técnico crudo que nunca se borra), **viola la norma tipográfica** (10–13 px frente a ≥ 16 px), **no hay tema claro/proyector**, y una persona no astrónoma **no sabe qué está viendo ni qué hacer después** (no hay acción tras el clic, la cuadrícula no tiene etiquetas, jerga sin explicar).

| Severidad | Cantidad |
| --- | --- |
| BLOCKER | 2 |
| MAJOR | 9 |
| MINOR | 11 |

## Puerta de calidad §8 de `07-estandar-ui.md`, punto por punto

| # | Punto | Resultado | Evidencia |
| --- | --- | --- | --- |
| 1 | `impeccable critique` + `audit` sin hallazgos de prioridad alta | **FALLA** | Auditoría abajo: A11y 1/4, Theming 1/4, Responsive 2/4; hallazgos B1, B2, M1–M9 |
| 2 | `web-design-guidelines` (accesibilidad e interacción) | **FALLA** | Sin `h1`, `header/footer` dentro de `main`, atajos de teclado invisibles, errores crudos, sin estados de carga (M2, M3, m6, m9) |
| 3 | Capturas escritorio, móvil, tema claro/proyector, reduced-motion + axe sin violaciones serias | **FALLA parcial** | Escritorio y móvil: hechas. axe: 0 serias, 1 moderada (`page-has-heading-one`). **Tema claro/proyector no existe** (M6): `desktop-light-reduced-motion.png` es idéntica al oscuro. Reduced-motion: pasa (no hay animación ni inercia). |
| 4 | Lista §2 revisada a mano por un humano | **PENDIENTE (humano)** | Pre-revisión de este agente: ninguna violación de §2 (ver tabla anti-slop) |
| 5 | "¿Parece plantilla?" | **PASA** | Parece un instrumento, no una landing |

### Auditoría `impeccable audit` (puntaje 0–4)

| # | Dimensión | Puntaje | Hallazgo clave |
| --- | --- | --- | --- |
| 1 | Accesibilidad | 1 | Sin alternativa de un solo puntero para zoom/pan (2.5.1, 2.5.7); sin selección por teclado |
| 2 | Rendimiento | 3 | Fuera de mi alcance (R-perf); observo 1,7 s de negro en cambio de banda (UX, M2) |
| 3 | Theming | 1 | Sin tema claro; colores sueltos fuera de tokens |
| 4 | Responsive | 2 | Funciona a 375 px y 200 %, pero oculta fecha/procedencia en móvil y la lectura tapa el cielo |
| 5 | Integridad | 3 | Interfaz coherente; tipografía 700 sin cara cargada |

### Lista anti-slop (§2 y AGENTS.md §7)

| Regla | Estado | Evidencia |
| --- | --- | --- |
| Gradientes, glass, blur, neón | OK | `style.css:1` sin `gradient`, `backdrop-filter`, `box-shadow` |
| Radio > 8 px | OK | `select{border-radius:3px}`; resto 0 |
| Emojis | OK | Ninguno |
| Estrellas/partículas decorativas | OK | Solo teselas reales de IRSA |
| Fuente distinta de IBM Plex | OK | Computado: `IBM Plex Sans` / `IBM Plex Mono` |
| `tabular-nums` en todo número | **Parcial** (m3) | Lectura Center/Cursor sí; FOV del pie y fechas del encabezado no |
| Un solo acento | OK | `--accent:#8ccece` solo en foco; cuadrícula `vec3(.38,.53,.54)` es un neutro frío tenue |
| Animación decorativa | OK | No hay animación |
| Cifras inventadas | OK | λ desde `WAVELENGTHS`; fechas coinciden con `t_min/t_max` de IRSA (2025-04-24 / 2026-05-14) |

### Contraste medido (WCAG 1.4.3)

| Texto | Tamaño | Color / fondo | Ratio | Resultado |
| --- | --- | --- | --- | --- |
| Título "SkyShift" | 18 px | #e9edf0 / #1d262d | 13,04:1 | Pasa |
| Subtítulo, fechas, ayuda | 12 px | #b6c2c9 / #1d262d | 8,45:1 | Pasa contraste; **falla tamaño** (M5) |
| Lectura valores | 12 px (10 px móvil) | #e9edf0 / #10151a | 15,59:1 | Pasa contraste; **falla tamaño** |
| Lectura etiquetas | 12 px (10 px móvil) | #b6c2c9 / #10151a | 10,09:1 | Pasa contraste; **falla tamaño** |
| Selects | 13 px | #fff / #10171c | 18,08:1 | Pasa |
| Foco | 2 px | #8ccece sobre cielo negro | > 3:1 (1.4.11) | Pasa; visible (`desktop-focus-canvas.png`, `desktop-focus-select.png`) |

### Pruebas funcionales de accesibilidad

| Prueba | Resultado |
| --- | --- |
| Orden de tabulación | canvas → Band → Projection → (body) → canvas. Lógico, sin trampa. |
| Teclado en el cielo | ←→↑↓ mueven, `+`/`-` zoom, PageUp/PageDown banda: **funciona** (URL pasó a `ra=187.05&dec=-61.55&fov=184.13&plane=2`). |
| Selección (pick) por teclado | **No existe** (M1). |
| `aria-live` del centro | Funciona: 400 ms tras detenerse anuncia `Center 12h 28m 12.0s −61° 32′ 56.0″ (187.04981°, -61.54888°)`. No anuncia banda ni FOV (M4). |
| Pellizco táctil (CDP, 375×812) | Funciona: FOV 359,62° → 138,32°. |
| Un solo puntero en táctil | **Sin botones de zoom/pan** (B1). |
| 200 % (720×450 CSS @2x) | Sin scroll horizontal; lienzo 287 px; la lectura tapa ~¼ del cielo (m7). |
| 375 px | Sin desbordes; selects 35 px de alto (≥ 24 px, pasa 2.5.8). Oculta fechas (M7). |
| `prefers-reduced-motion` | Sin animación ni inercia: pasa por ausencia. Cuando se agregue inercia, debe respetarlo. |
| IRSA bloqueado | Lienzo negro total + `Some tiles are unavailable: Failed to fetch` (M3). |
| 404 y luego recuperación | El aviso `Tile request failed: 404` **sigue visible** tras cargar bien (M3). |

## Hallazgos

### BLOCKER

**B1 · Zoom y desplazamiento sin alternativa de un solo puntero (WCAG 2.5.1 nivel A y 2.5.7 nivel AA).**
- Evidencia: en táctil la única forma de hacer zoom es el pellizco (multipunto) y la única forma de moverse es arrastrar; no hay botones `+`/`−`, ni flechas de desplazamiento, ni "ir a coordenada". El teclado no cuenta como alternativa de puntero. Capturas `mobile-allsky.png`, `mobile-after-pinch.png`. El visor oficial de IRSA sí tiene `−`/`+` (`irsa-desktop.png`, abajo a la izquierda).
- Archivo: `frontend/src/ui/app.tsx:30-31` (pie sin controles de zoom/pan); `frontend/src/engine/adapters/input.ts:23` (zoom solo por rueda) y `:19` (pinch).
- Arreglo: añadir en el pie un grupo `role="group" aria-label="Zoom"` con `<button aria-label="Zoom in">+</button>` / `<button aria-label="Zoom out">−</button>` y "Reset view", que llamen a un nuevo método del motor `zoomBy(factor)` / `setView(DEFAULT_VIEW)`; mínimo 24×24 px (ideal 44×44 en móvil). Para 2.5.7 basta con los botones de zoom + un campo "Go to RA/Dec" (que además cubre la búsqueda que tiene IRSA).

**B2 · No hay texto ≥ 16 px en la interfaz (norma §7 "no negociable") y la lectura baja a 10 px en móvil.**
- Evidencia (estilos computados): subtítulo/fechas/ayuda 12 px, pie 13 px, lectura 12 px y **10 px** a ≤ 600 px.
- Archivo: `frontend/src/style.css:1` (`.subtitle{font-size:12px}`, `.observed,.help{font-size:12px}`, `footer{font-size:13px}`, `.readout{font:12px/1.8 …}`, `@media(max-width:600px){… .readout{font-size:10px}}`).
- Arreglo: escala de 4–5 tamaños en tokens (`--fs-1:14px` solo para metadatos secundarios si el equipo lo acepta por ADR; `--fs-2:16px` base; `--fs-3:18px` proyector). Base 16 px para controles y lectura; nunca 10 px. Si la lectura no cabe en móvil, partir en dos líneas (sexagesimal / decimal) en lugar de encoger.

> Nota: B2 es una regla interna del proyecto (`07` §7), no un criterio WCAG; queda como BLOCKER porque la norma dice "no negociable" y "un PR de UI que la viole no se mergea".

### MAJOR

**M1 · La salida principal (`onPick`) no se puede usar con teclado ni se ve en pantalla; no hay "siguiente paso".**
- Evidencia: el clic solo cambia la línea "Cursor" y el texto oculto `Selected 12h 28m 12.0s …`; no hay marcador, ni panel, ni botón "Open time series for this point" (`desktop-after-click.png`). No hay tecla (Enter/Espacio) para seleccionar el centro. Una persona no astrónoma no sabe qué hacer después de mirar.
- Archivo: `frontend/src/ui/app.tsx:20` (pick solo alimenta `announcement`); `frontend/src/engine/adapters/input.ts:26-31` (sin `Enter`).
- Arreglo: en `input.ts` tratar `Enter`/` ` como `pick` del centro del lienzo; en `app.tsx` guardar `selected` en estado y mostrar un panel pequeño con la coordenada, una retícula en el punto y un botón primario (acento) "Show changes over time here" (enlace a la ficha 0002). Mientras 0002 no exista: "Copy coordinates" + texto "Time comparison coming soon" (sin prometer).

**M2 · Sin estado de carga; lienzo totalmente negro al arrancar y 1,7 s de negro al cambiar de banda.**
- Evidencia: muestreo del brillo medio del lienzo tras PageUp a FOV 10°: 0 desde 0,04 s hasta 1,68 s, luego aparece (`desktop-band-switch-blackout.png` vs `desktop-band-switch-loaded.png`). El estándar §6 exige "cargando (progreso honesto)". IRSA conserva la imagen anterior durante el cambio de frame.
- Archivo: `frontend/src/engine/engine.ts:57` (`key.endsWith(\`/${view.plane}\`)` descarta las teselas de la banda anterior); `frontend/src/engine/adapters/webgl-renderer.ts:49` (tesela ausente → negro); `frontend/src/ui/app.tsx:27` (no hay indicador de carga).
- Arreglo: (a) mientras la banda nueva carga, dibujar las teselas de la banda anterior (o la de orden 0 ya cacheada) y marcarlo en la lectura "Showing 0.753 µm while 0.771 µm loads"; (b) emitir un evento `progress {loaded, wanted}` desde `render()` y mostrar "Loading sky images from IRSA… 9 of 12" en una línea `role="status"`; (c) precargar el orden 0 (12 teselas) de las bandas vecinas ±1.

**M3 · Mensajes de error técnicos, sin acción y que nunca se borran.**
- Evidencia: con IRSA bloqueado: lienzo negro + `Some tiles are unavailable: Failed to fetch` (`desktop-offline-irsa-blocked.png`). Tras un 404 y la posterior carga correcta, el aviso `Tile request failed: 404` sigue en pantalla (`desktop-404-then-recovered.png`). Un 404 es normal en HiPS (la ficha pide escalar el padre), pero se presenta como fallo. No hay "Retry", ni modo offline/demo (§6).
- Archivo: `frontend/src/engine/engine.ts:54` (concatena `error.message`); `frontend/src/ui/app.tsx:10,19,27` (el estado nunca se limpia).
- Arreglo: el motor emite estados tipados (`{kind:'offline'} | {kind:'partial', missing:n} | {kind:'ok'}`), no texto; la UI los traduce: "Can't reach IRSA right now. Cached areas are still shown. [Retry]" y "Some deep tiles don't exist for this area; showing a coarser image." Limpiar el aviso cuando `kind:'ok'`. No tratar 404 como error de red. Sin nada en caché: texto centrado en el lienzo, no negro mudo.

**M4 · El lector de pantalla no se entera del cambio de banda ni del zoom.**
- Evidencia: tras PageUp ×2 y `+` ×3 el `aria-live` dice solo `Center …`; la banda (0,790 µm) y el FOV no se anuncian.
- Archivo: `frontend/src/ui/app.tsx:18`.
- Arreglo: componer el anuncio con lo que cambió: `Band 2, 0.790 micrometres` / `Field of view 184 degrees` / `Center RA 12h 28m, Dec minus 61° 33′`. Usar "micrometres" y "minus" en el texto para lector (los símbolos `µm` y `−` se leen mal), y quitar la doble coma decimal/sexagesimal del anuncio.

**M5 · Persona no astrónoma: no sabe qué está viendo.**
- Evidencia (`desktop-allsky-t20s.png`): no hay frase que diga "Whole sky seen by NASA's SPHEREx infrared telescope; the bright band is the Milky Way". Jerga sin explicar en la capa simple: "HiPS", "asinh", "uncertainty unavailable", "SIN/TAN/AIT", "µm", fechas sin etiqueta ("2025-04-24–2026-05-14" ¿de qué?). Las bandas 50 y 51 dicen solo "blank". La cuadrícula RA/Dec no tiene etiquetas de valores, así que no se puede leer (spec §1 pide "ver la cuadrícula RA/Dec").
- Archivo: `frontend/src/ui/app.tsx:24` (encabezado), `:30` (opciones de banda), `:31` (proyección en capa simple); `frontend/src/engine/adapters/webgl-renderer.ts:56-57` (cuadrícula sin etiquetas).
- Arreglo: `<h1>SkyShift</h1>` + una línea "Infrared images of the whole sky from NASA's SPHEREx (Data Release 1, via NASA/IPAC IRSA). Visualization only — brightness is not a measurement." Fechas con etiqueta: "Observed 24 Apr 2025 – 14 May 2026". Banda: "Infrared colour 0.75 µm (wavelength)" con `title`/ayuda "1 µm = one thousandth of a millimetre; our eyes see up to 0.7 µm". Bandas 50–51: "no data (detector gap)". Mover proyección, "asinh" y "uncertainty" a una capa "Inspect". Etiquetas de RA/Dec en el borde del lienzo (texto HTML superpuesto, Plex Mono, `tabular-nums`).

**M6 · No existe tema claro / proyector (exigido por §3 y §8.3, y `04` §6).**
- Evidencia: con `prefers-color-scheme: light` la página es idéntica (`desktop-light-reduced-motion.png`). La única media query es `(max-width: 600px)`.
- Archivo: `frontend/src/style.css:1` (`:root` con colores fijos).
- Arreglo: tokens en `:root` + `[data-theme="projector"]` (fondo de interfaz claro, texto ≥ 18 px, borde 1 px oscuro); el lienzo del cielo sigue negro. Conmutador "Projector mode" en la capa Inspect y respetar `prefers-color-scheme`.

**M7 · En móvil se oculta la fecha y la ayuda; la procedencia deja de estar "siempre a un vistazo".**
- Evidencia: `mobile-allsky.png`: no aparece "2025-04-24–2026-05-14"; la ayuda tampoco. AGENTS.md §1: nunca separar imagen y metadatos (fecha, banda, colección).
- Archivo: `frontend/src/style.css:1` (`@media(max-width:600px){… .observed,.help{display:none} …}`).
- Arreglo: no ocultar `.observed`; ponerla en una segunda línea del encabezado. La ayuda en móvil: "Drag to move · pinch or use +/− to zoom" (tras B1).

**M8 · Atajos de teclado invisibles para usuarios videntes de teclado.**
- Evidencia: la ayuda visible dice "Drag to move · scroll to zoom"; flechas, `+/-` y PageUp/PageDown solo están en el `aria-label` del lienzo.
- Archivo: `frontend/src/ui/app.tsx:26,31`.
- Arreglo: al enfocar el lienzo, cambiar la ayuda a "Arrows move · + / − zoom · Page Up/Down band · Enter select" (o un botón "Keyboard shortcuts" con `<dl>`); además `aria-keyshortcuts` en el lienzo.

**M9 · Peor que el visor oficial de IRSA (Aladin Lite) en controles básicos de orientación.**
- Evidencia: `irsa-desktop.png` / `irsa-mobile.png` vs. nuestras capturas. IRSA tiene: botones `−`/`+`, "Reset position", campo de coordenadas editable (ir a), retícula en el centro, FOV "180.0° × 154.6°", deslizador de frame con ◀/▶ y "frame 2 / 102 · 0.771 um", pantalla completa, y panel de propiedades que explica los 102 frames y por qué 50/51 están vacíos. Nosotros no tenemos ninguno de esos controles; solo un `<select>` de 102 opciones (lento de recorrer en móvil).
- Archivo: `frontend/src/ui/app.tsx:28-31`.
- Arreglo (sin copiar código GPL): botones zoom/reset (B1); ◀/▶ junto al select de banda; retícula fina en el centro (CSS, no WebGL); FOV en ambos ejes; campo "Go to" que acepte "133.7951 -7.2451" o sexagesimal. Donde ya somos mejores, mantener: lectura sexagesimal + decimal, procedencia visible, estado en la URL, cuadrícula, banda por teclado.

### MINOR

| # | Hallazgo y evidencia | Archivo:línea | Arreglo |
| --- | --- | --- | --- |
| m1 | Sin `<h1>` (axe `page-has-heading-one`, moderado). | `frontend/src/ui/app.tsx:24` | `<h1>` en "SkyShift". |
| m2 | `header`/`footer` dentro de `<main>` → no son landmarks `banner`/`contentinfo`. | `frontend/src/ui/app.tsx:23-33` | Mover `header` y `footer` fuera de `main` (fragmento o `div.shell`). |
| m3 | FOV y fechas sin `tabular-nums` ni Plex Mono; el número salta al hacer zoom. | `frontend/src/ui/app.tsx:31`, `:24`; `style.css:1` | Clase `.num{font-family:'IBM Plex Mono';font-variant-numeric:tabular-nums}`. |
| m4 | `strong` pide peso 700 pero solo se cargan caras 400 y `font-synthesis:none` → el "negrita" se ve normal. | `frontend/src/main.tsx:3-4`; `style.css:1` | Importar `@fontsource/ibm-plex-sans/600.css` (y usar 600) o no usar `strong`. |
| m5 | "Cursor: Move pointer over sky" en táctil/teclado no tiene sentido. | `frontend/src/ui/app.tsx:28` | Con `pointer: coarse` o foco de teclado: "Tap a point to read its position". |
| m6 | Copia técnica: "Invalid URL state. Default view loaded.", "WebGL context lost. Reload to restore the sky." | `frontend/src/ui/app.tsx:10`; `frontend/src/engine/engine.ts:68` | "This link had an invalid sky position, so the whole sky is shown." / "The graphics view stopped. [Reload]". |
| m7 | A 200 % y en móvil la lectura tapa ~¼ del cielo y se parte en dos líneas. | `frontend/src/style.css:1` (`.readout`) | Lectura plegable o fuera del lienzo (franja sobre el pie) cuando `height < 500px`. |
| m8 | Select "SIN" muestra un valor y se dibuja AIT (FOV > 180°); estado contradictorio. | `frontend/src/ui/app.tsx:31` | Mostrar "AIT (auto)" en el select o deshabilitar SIN sobre 180°. |
| m9 | Colores sueltos fuera de tokens (`#26333b`, `#10171c`, `#fff`, `#000`, `#10151a` repetido). | `frontend/src/style.css:1` | Todo en `--*` (§3 "prohibido el valor suelto"). |
| m10 | Índice de banda 0-based ("0 · 0.753 µm") vs IRSA 1-based ("frame 2/102 · 0.771 um"); confunde al cruzar con IRSA. | `frontend/src/ui/app.tsx:30` | Mostrar λ primero y el índice como "channel 1/102" o documentar la equivalencia en el tooltip. |
| m11 | Con el backend ANGLE GLES/SwiftShader (`--use-gl=angle --use-angle=swiftshader`) el cielo completo se dibuja con huecos negros y FOV 1° muestra solo píxeles de orden 0, sin ningún aviso (`desktop-allsky-angle-gles-swiftshader.png`). Con el backend por defecto se ve bien. Puede ser del driver, pero la UI no avisa. | `frontend/src/engine/adapters/webgl-renderer.ts` (sin comprobación de capacidades) | Pasar a R-perf/física para reproducir; como mínimo, detectar render vacío tras N teselas listas y mostrar "Your graphics driver may not display this map correctly". |

## Qué está bien (mantener)

- Cero slop: sin gradientes, glass, sombras, emojis ni decoración; radios 3 px; IBM Plex verificada.
- Contraste alto en todo el texto (8,45:1 a 18:1) y foco visible de 2 px con el acento.
- Teclado completo para mover, zoom y banda; orden de tabulación lógico; sin trampas.
- `aria-live` con retardo de 400 ms (no satura el lector) y región `role="status"` para avisos.
- URL inválida → vista por defecto + aviso visible, sin excepción (`desktop-invalid-url.png`).
- Procedencia en el encabezado ("SPHEREx DR1 HiPS · IRSA · visualization only") y λ en µm en cada opción.
- Pellizco funcional, sin scroll horizontal a 375 px ni a 200 %.

## Capturas (`docs/reviews/sky-engine/r2/`)

| Archivo | Qué muestra |
| --- | --- |
| `desktop-allsky-t3s.png`, `desktop-allsky-t20s.png` | Cielo completo 1440×900 (a los 3 s y 20 s) |
| `desktop-allsky-angle-gles-swiftshader.png` | Render roto con backend GLES (m11) |
| `desktop-wise0855-fov1.png`, `desktop-wise0855-t20s.png` | WISE 0855, FOV 1°, banda 20 |
| `desktop-focus-canvas.png`, `desktop-focus-select.png` | Foco visible |
| `desktop-after-click.png` | Tras clic/teclado: sin marcador ni siguiente paso; negro tras cambio de banda |
| `desktop-band-switch-blackout.png`, `desktop-band-switch-loaded.png` | M2 |
| `desktop-offline-irsa-blocked.png` | IRSA bloqueado (M3) |
| `desktop-404-then-recovered.png` | Aviso 404 persistente (M3) |
| `desktop-invalid-url.png` | `?ra=400&dec=abc` |
| `desktop-light-reduced-motion.png` | Tema claro + reduced-motion: sin cambios (M6) |
| `zoom200-1440x900.png` | 200 % |
| `mobile-allsky.png`, `mobile-after-pinch.png`, `mobile-wise0855-fov1.png` | 375×812 táctil |
| `irsa-desktop.png`, `irsa-mobile.png` | Visor oficial IRSA para comparar |

## Límites de esta revisión

- Navegador sin GPU real (SwiftShader); no probé un lector de pantalla real (NVDA/Orca), solo el contenido del `aria-live`. Pellizco probado con eventos táctiles emulados, no en dispositivo.
- No evalué rendimiento ni exactitud de coordenadas (otros revisores).
- Puntos 4 y 5 de la puerta §8 requieren a un humano del equipo.
