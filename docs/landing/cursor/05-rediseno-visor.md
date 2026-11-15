# Encargo 5 · Rediseño del visor Copernix (feedback de Daniel sobre las rondas 2 y 4)

Carpeta tuya: **`frontend/copernix/`** y `frontend/tests/copernix/`. Mismas restricciones que `00-contexto.md` y `02-visor-copernix.md` (no tocar `src/engine/**`, `src/ui/**`, `src/app/**`). Puedes reescribir `App.tsx` y `viewer.css`; conserva la lógica que ya funciona (carga de series, i18n, `explain-i18n.ts`, estados, URL). Capturas de lo que NO gusta: `docs/landing/copernix-qa/revision2-es-desktop.png`.

## Lo que dijo Daniel
1. «No me gusta la interfaz»: **se ve pesada y azul**, **la distribución tapa el mapa** y **no se siente de la landing**.
2. «El marcador salta donde hago clic y no tiene sentido».

## A. Dirección visual: calma y editorial, como la landing
- **Nada de paneles azules saturados.** Superficies: `rgba(3,14,34,.84)` (casi negro azulado), borde `1px solid rgba(255,255,255,.12)`, brillo interno `inset 0 1px 0 rgba(255,255,255,.14)`, radio 14 px, sin `backdrop-filter`, sin degradados azules. El azul `#428bca` solo como subrayado/acento; morado solo en puntos y anillos.
- **Sin barra superior grande.** Arriba-izquierda, solo la marca `Copernix` (enlace a `/`) en Bricolage 600; arriba-derecha, `ES | EN` en texto y un icono de lupa (abre el buscador en un popover opaco). Sin cajas.
- **Mapa limpio**, con el atenuado y la viñeta que ya existen, y un *scrim* (degradado `#030e22 → transparente`) en el lado izquierdo para que el texto se lea sin caja.
- Tipografía grande, aire, poco texto, como la landing (`landing/css/styles.css`: titulares Bricolage, lead en gris `--dim`).

## B. Distribución (escritorio)
```
Copernix                                              🔍  ES | EN
                                                            
WISE 0855-0714        ← título grande (Bricolage 600, ~2.6rem)
La enana marrón más fría que se conoce.   ← una línea, lenguaje simple

Objetos                          ┌──────────────┐
  Barnard's Star                 │  recorte     │  ← tarjeta pequeña (≈ 260 px)
  Epsilon Indi B                 │  Antes·Desp. │    abajo-derecha; clic = ampliar
  WISE 0855-0714  ← activo       └──────────────┘
  RW Aurigae                     2026-03-06
  R Draconis

¿Qué cambió?  Las imágenes muestran una diferencia aparente.
● Observado  ○ Evaluado  ○ Confirmado          [ Detalles y procedencia ]

        ▶  ──●────────●──○──   09-04   03-06     Bucle · Diferencia · Color
```
- **Columna izquierda** (≈ 340 px, sin caja, sobre el scrim): título del objetivo, su descripción de una línea (`CHALLENGE_TARGETS[].description` traducida), lista vertical de los 5 objetivos como **texto** (activo: subrayado azul + punto violeta a la izquierda), debajo «¿Qué cambió?» en **una o dos frases**, el **semáforo en una línea** (tres puntos con su rótulo, el activo relleno) y un enlace de texto «Detalles y procedencia» que abre un cajón lateral opaco (archivo, fecha UTC, banda/λ, colección, nota de movimiento esperado, etc. — todo lo que hoy está en el panel largo).
- **Tarjeta del recorte** abajo-derecha, pequeña; clic → modal/cajón con el recorte grande y la leyenda. Un recorte sin sus metadatos no se muestra solo: su pie siempre lleva fecha y λ.
- **Barra inferior delgada** (una sola fila, centrada, ancho ≤ 760 px): ▶/⏸, línea de tiempo con fechas bajo los puntos, y a la derecha los modos «Bucle · Diferencia · Color» (texto). **La escala magenta→ámbar de bandas solo aparece cuando el modo es «Color»** (se despliega encima de la barra) o desde un botón «Colores». «Proyección y zoom» va dentro de un menú «⋯».
- **Móvil (≤ 820 px)**: título arriba, lista de objetivos como fila con scroll horizontal, barra inferior compacta, y la información («¿Qué cambió?», semáforo, recorte, detalles) en un **bottom sheet** plegado por defecto.

## C. Interacción coherente con el modelo físico (lo más importante)
Estado explícito (reducer o máquina de estados en `copernix/src/selection.ts`, con **pruebas unitarias** en `frontend/tests/copernix/selection.test.ts`):
- `target`: el objetivo activo y **sus coordenadas reales** (de `CHALLENGE_TARGETS` o las del `resolve`). **El marcador del objetivo vive siempre en esas coordenadas del cielo** (se reproyecta con `sky.screenPosition` en cada `viewchange`); **un clic en el mapa jamás lo mueve** ni cambia su etiqueta.
- `candidate` (punto elegido): un clic o un toque en el mapa crea *solo* un candidato, dibujado distinto (cruz fina `+` blanca de 14 px, sin anillo violeta, con sus coordenadas en mono al lado) y un botón de texto «Analizar este punto» junto a él. `Esc` o un segundo clic en el mismo punto lo descartan. El panel/columna izquierda **no cambia** mientras haya un candidato.
- `custom`: solo al pulsar «Analizar este punto» el objetivo pasa a ser un punto personalizado; entonces el título muestra «Punto RA …°, Dec …°», el marcador se ancla a esas coordenadas, la lista de objetivos deja de marcar ninguno y aparece «Volver a <último objetivo>».
- **Volver al objetivo**: si el centro de la vista queda a más de ~1,5 × el FOV del objetivo (o el objetivo está fuera de pantalla), aparece un botón de texto «Volver a <objetivo>» abajo a la izquierda que hace `flyTo` a sus coordenadas. Doble clic en el título también.
- El arrastre y el zoom del motor no cambian la selección. Clics sobre la UI no llegan al mapa (`stopPropagation` en las superficies).
- Teclado: `Esc` descarta el candidato; `Enter` sobre el candidato lo analiza; flechas del motor intactas. `aria-live` anuncia candidato y cambios de objetivo.
- URL: `?target=` o `?ra=&dec=` para `custom`; el candidato **no** va en la URL.

## Verificación (obligatoria)
`pnpm lint`, `pnpm test` (incluye `selection.test.ts`), `pnpm build:copernix`, `node scripts/check-landing.mjs`. Con la API en `:8000` (ya corre) y `pnpm dev:copernix` en `:5173`, un script Playwright con Chrome SwiftShader (`--disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader`) que: abre `/viewer/?target=rw-aurigae&lang=es`, mide la posición en pantalla del marcador del objetivo, hace clic en tres puntos del mapa y comprueba que el marcador **no se movió** y que aparece el candidato; pulsa «Analizar este punto» y comprueba el cambio a `custom`; pulsa «Volver a …». Guarda capturas en `docs/landing/copernix-qa/revision3-{es,en}-desktop.png`, `revision3-es-mobile.png` y `revision3-candidato.png`; **míralas y corrige** solapes antes de responder. No cierres el servidor `:4410` ni la API `:8000`.
