# Landing · Copernix (Planet X and SPHEREx)

Página de presentación, ES/EN. Sin build ni npm. Decisión: `docs/adr/0006-landing-estatica.md`.

Un solo origen en desarrollo (`127.0.0.1:4410`): la landing en `/`, el visor en `/viewer/` (build en `frontend/dist-copernix`) y la API en `/api/*` (proxy a `127.0.0.1:8000`).

```bash
mise run copernix          # API + servidor unificado (recomendado para la demo)
mise run copernix-build    # genera frontend/dist-copernix (encargo del visor)
mise run landing           # solo el servidor en :4410 (sin levantar la API)
uv run --no-project python scripts/serve_landing.py 4410
```

Paquete estático para entrega: `node scripts/build-landing.mjs` → `dist/landing/` (incluye `viewer/` si existe el build).

Con `?dev` en la URL aparecen las notas de desarrollo y el panel de métricas locales. `?lang=es|en` fuerza el idioma.

## Estructura

| Ruta | Qué es |
| --- | --- |
| `index.html` | Marcado y textos base en inglés |
| `css/styles.css` | Todo sale de los tokens de `:root` (paleta del equipo) |
| `js/app.js` | Escenas guiadas por scroll, interacciones, fuentes y créditos |
| `js/i18n.js` | Textos ES/EN y listas de fuentes (misma clave en ambos idiomas) |
| `js/sat3d.js` | Modelo 3D de SPHEREx (NASA's Eyes · NASA/JPL-Caltech) con three.js |
| `assets/` | Ilustraciones generadas con IA + `manifest.json` |
| `lib/`, `model/`, `fonts/` | three.js (MIT), modelo glTF y tipografías (OFL), todo local |

## Diseño (decisiones)

- **Paleta**: la del equipo. Fondo `#030E22` (`#061F4A` llevado ~45 % hacia negro), texto blanco y `#AEB0B5`, acento `#428BCA`. Morado (`--violet`) solo en detalles: una de las dos capas de nubes, el anillo del marcador, los números de los pasos y el punto activo del menú. Botones blancos; sin amarillo.
- **Sin brillos**: ningún `box-shadow` de color, `shadowBlur`, halo ni anillos pulsantes. El cuerpo que cambió se marca con un punto blanco y un anillo fino violeta.
- **Vidrio líquido** en las etiquetas, el menú, el dock y las tarjetas de pasos (`.surface`): desenfoque + borde con luz fija. Sin efecto linterna en hover ni degradados que sigan al mouse.
- **Vida en reposo**: dos capas de nubes (ruido fractal periódico, azul y morado) a la deriva, parpadeo suave de las estrellas, un punto que cruza el inicio, el satélite girando lento, la línea del comparador que respira y un barrido de bandas. Todo se apaga con `prefers-reduced-motion`. Las nubes se pintan a media resolución y solo cuando se mueven (el fondo cuesta ~1 ms por cuadro; `?dev` lo muestra).
- **Satélite**: queda debajo del texto y se gira 360° arrastrando o con las flechas (en pantallas táctiles solo en horizontal, para no robar el scroll).
- **Bandas**: la escala original magenta → ámbar, apagada, con la banda activa en pleno color y rotulada como forma ilustrativa.
- **Pasos del método**: la descripción aparece al pasar el mouse o al enfocar con el teclado; sin hover (táctil) se muestran siempre.
- **Tipografía**: Bricolage Grotesque para titulares y texto; IBM Plex Mono solo para coordenadas, longitudes de onda y velocidades.

## Imágenes generadas con IA

Prompts y reglas: `docs/landing/prompts-imagenes-chatgpt.md`. Para añadir o cambiar una:

```bash
uv run --no-project --with pillow==12.3.0 python scripts/prepare_landing_images.py ORIGINAL.png landing/assets/obj-nombre.webp --ratio 4:3 --width 800
```

Después se registra en `assets/manifest.json` y se anota en `docs/AI_USAGE.md`. La página las rotula "AI illustration" y no las usa como datos.

## Enlaces del visor

Los CTA («Explorar el cielo», «Explorar este punto» y «Verlo en Copernix →» en cada objeto de prueba) navegan al visor en **`/viewer/`** con `?target=<slug>` o `?ra=` y `?dec=` según el contexto. Los slugs coinciden con `frontend/src/app/core/targets.ts` (`wise-0855`, `barnards-star`, `epsilon-indi-b`, `rw-aurigae`, `r-draconis`). El conteo local `NZ.cta` y el evento `cta_click` se conservan al pulsar cualquier `[data-cta]`.

## Corrección de estabilidad, conservando el diseño original (2026-11-14)

Por solicitud de Daniel se revirtió el rediseño posterior. Se conservaron las imágenes, tipografías, textos ES/EN, geometría, duraciones de scroll, escenas sticky, parallax y controles originales.

Para evitar la ruta WebGL del bloqueo Intel i915 registrado: el mismo modelo de SPHEREx se prerenderizó por CPU con SwiftShader, usando su iluminación original. La web utiliza 360 vistas pequeñas (72 ángulos × 5 inclinaciones), carga una por vez y guarda como máximo 8 imágenes decodificadas. Conserva giro automático, arrastre horizontal 360° y flechas; la inclinación se limita a cinco vistas entre -50° y +50°.

Se mantiene el fondo animado, con refresco en reposo de hasta 10 Hz; las animaciones JS se programan hasta 20 fps. Los canvas no exceden ~0,9 MP, solicitan contexto 2D orientado a CPU y se suspende todo el planificador al ocultar la pestaña. Los paneles mantienen color, borde y sombra originales, sin backdrop blur. Esto no modifica el controlador del sistema.

Validación y paquete estático (Node 22+):

    node scripts/check-landing.mjs
    node tests/landing/render-scheduler.test.mjs
    node scripts/build-landing.mjs

La compilación crea dist/landing sin Three.js ni el modelo glTF. Las vistas pesan aproximadamente 4 MB en conjunto, pero se solicitan individualmente; no se precarga la colección. El smoke test usa Playwright, acepta LANDING_URL / PLAYWRIGHT_MODULE / CHROME_PATH / TEST_OUTPUT_DIR y siempre prueba sin GPU física.

English: original presentation and scroll restored. The satellite uses CPU-prerendered views, loaded one at a time with an eight-image cache. Live WebGL and backdrop blur are disabled, canvas resolution is bounded, and hidden tabs suspend rendering. No OS driver changes.
