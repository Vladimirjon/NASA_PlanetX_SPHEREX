# Prompts de imágenes para la landing (ChatGPT Images)

Uso: https://chatgpt.com/images. Cada prompt va **completo** (bloque de estilo + sujeto) en un chat nuevo. Los prompts están en inglés porque el modelo respeta mejor las restricciones de color y composición; el resto del doc está en español.

## Reglas del repo que aplican (AGENTS.md §4 y `docs/context/07-estandar-ui.md`)

- Son **ilustraciones de artista**, no datos. La página las rotula "AI illustration" y ninguna se usa donde el lector pueda tomarla por una imagen de SPHEREx.
- **No se generan con IA** el antes/después de la sección "Can you spot what changed?" ni nada que simule el cielo observado: serían datos inventados. Ahí van recortes reales de SPHEREx cuando exista el visor.
- Sin logos ni identificadores de NASA. Cada imagen generada se anota en `docs/AI_USAGE.md`.

## Archivos y dónde se usan

| Archivo (`landing/assets/`) | Uso en la página | Tamaño final | Composición |
| --- | --- | --- | --- |
| `hero-deep-field.webp` | Fondo del hero (mezcla `screen`; sin marca grabada, la página superpone su rótulo) | 1672 × 940 (16:9) | Centro muy oscuro y vacío: ahí va el titular |
| `obj-wise-0855.webp` | Sección "Five objects to try" | 800 × 600 (4:3) | Sujeto centrado, ~55 % del cuadro |
| `obj-barnard.webp` | ídem | 800 × 600 | ídem |
| `obj-epsilon-indi-b.webp` | ídem | 800 × 600 | ídem |
| `obj-rw-aurigae.webp` | ídem | 800 × 600 | ídem |
| `obj-r-draconis.webp` | ídem | 800 × 600 | ídem |

ChatGPT eligió solo el formato (entregó 1536 × 1024, 1448 × 1086 o 1672 × 941 según la imagen): `scripts/prepare_landing_images.py` recorta al centro a 4:3 o 16:9, graba la marca de agua y exporta WebP.

## Bloque de estilo (se pega al inicio de todos)

```
Photorealistic scientific artist's-concept illustration, as if captured by a deep-space camera. Strictly MONOCHROME BLUE palette and nothing else: near-black navy background #030E22, mid-tones #15418C and #428BCA, highlights pure white #FFFFFF. No other hue anywhere (no yellow, orange, red, purple, green). Matte, physically based lighting from one distant source, natural soft falloff. Absolutely NO glow, NO bloom, NO halo, NO corona, NO lens flare, NO diffraction spikes, NO neon, NO sparkles, NO light rays. Crisp, clean edges, very fine film grain. No text, letters, numbers, logos, labels, watermarks, UI, people or spacecraft. Landscape orientation, subject centered and filling about 55% of the frame with generous empty dark margin on all sides, so it can be cropped to 4:3 from the center.
```

## Prompts por sujeto (se pegan después del bloque de estilo)

**obj-wise-0855** — WISE 0855, enana marrón helada

```
Subject: WISE 0855, an extremely cold brown dwarf about the size of Jupiter, alone in empty space. A dark, nearly black globe with soft, subtle cloud bands and faint mottled patches of water-ice clouds. Only a thin edge of the sphere catches faint starlight from the upper left; most of the globe stays dark because the object is too cold to shine in visible light. Matte surface, no atmosphere glow.
```

**obj-barnard** — Estrella de Barnard, enana roja

```
Subject: Barnard's Star, a small dim red dwarf star, much smaller than the Sun. Show the stellar disc with fine convective granulation texture, a few dark starspots, and slightly darker limb edges (limb darkening). The disc has a crisp edge and no corona or glow. Rendered in the blue monochrome palette: brightest areas near white, shadowed granules in #15418C.
```

**obj-epsilon-indi-b** — Epsilon Indi B, par de enanas marrones

```
Subject: Epsilon Indi B, a pair of brown dwarfs orbiting each other, seen close together on a diagonal with a small dark gap between them. One globe is slightly larger than the other. Each is a dark sphere with soft horizontal cloud bands, lit from the upper left by a distant star so a thin crescent of light shows on each, the rest in shadow. Matte, no glow.
```

**obj-rw-aurigae** — RW Aurigae, estrella joven que se atenúa

```
Subject: RW Aurigae, a young star with a thin protoplanetary disc seen almost edge-on, and a long curved stream of dust and gas arcing across the frame and partly passing in front of the star, dimming it. The star is a small, crisp, bright white disc. The dust stream is translucent and finely textured, with irregular filaments. No glow around the star.
```

**obj-r-draconis** — R Draconis, gigante roja pulsante

```
Subject: R Draconis, an old red giant star (Mira-type variable), hugely bloated, with a lumpy, irregular surface of giant convection cells and a ragged, slightly asymmetric outline. A faint, thin shell of translucent dust wisps surrounds it, barely visible. Matte surface, crisp edge, no glow, no corona.
```

**hero-deep-field** — fondo del hero (este es 16:9, no 4:3)

```
Subject: Abstract deep-space backdrop. A very dark, wide, faint interstellar dust lane with extremely subtle texture, crossing a fine field of tiny white point-like stars (no spikes, no bloom). Mostly empty and very dark, especially the center, so white headline text can sit on top and stay legible. No recognizable galaxy, planet or bright nebula. Wide landscape, 16:9 crop from the center.
```

## Después de generar

1. Recortar y reducir al tamaño de la tabla; exportar a WebP (calidad ~80; objetivo ≤ 150 KB cada uno).
2. Guardar en `landing/assets/` con el nombre exacto de la tabla.
3. Registrarlo en `landing/assets/manifest.json` (la página los muestra solo si están ahí).
4. Añadir una línea por imagen en `docs/AI_USAGE.md` (herramienta: ChatGPT Images; revisión humana: quién la validó).
5. Revisión humana de cada ilustración: que no parezca un dato, que no tenga color fuera de la paleta, que no tenga brillo ni texto.

## Registro de la primera tanda (2026-11-14)

Generadas las seis en ChatGPT Images con estos prompts, a la primera. Observaciones para quien las revise: R Draconis salió con manchas casi blancas que se acercan a un aspecto de plasma (si se quiere más sobrio, repetir con "no bright hot spots"); RW Aurigae es muy ancha y el recorte 4:3 le corta las puntas del disco; el fondo del hero es casi negro a propósito.

## Cuadros del método «Antes / Después / Lo que cambió» (2026-11-14)

Un solo prompt (1:1) genera el campo de estrellas **sin objeto en movimiento**; el script `scripts/make_method_frames.py` copia una de sus estrellas a dos posiciones vacías (antes y después) y calcula la resta. Así los tres cuadros son coherentes entre sí. Archivos: `landing/assets/method-{earlier,later,diff}.webp` (640 × 640). El pie de la figura dice «Esquema, no son datos reales. Campo de estrellas generado con IA.»

```
Realistic but schematic astronomy image: a small square crop of a deep-sky infrared survey frame, as a space telescope detector would record it. Very dark navy background (#061F4A), fine sensor grain and faint subtle noise. A sparse field of about 14 stars of different sizes and brightness, each a soft round point with a natural gaussian falloff, white to pale blue (#428BCA tint), two or three slightly brighter than the rest. Keep a clear empty dark area in the middle-left and middle-right of the frame, with no star there. Strictly monochrome blue palette, no other hue. NO diffraction spikes, NO glow, NO bloom, NO lens flare, NO nebula, NO galaxy, NO text, NO labels, NO grid, NO borders, NO watermark. Flat even background, no vignette. Square 1:1 composition.
```

Original (1254 × 1254 PNG) solo en el scratchpad de la sesión; si se regenera, ajustar `SPRITE_AT`, `EARLIER` y `LATER` en el script a las zonas vacías de la nueva imagen.
