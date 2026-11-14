# 03 · Datos y APIs (medido en vivo el 14-nov-2026)

Etiquetas: **[medido]** = probado hoy con llamadas reales · **[doc]** = documentación oficial · **[inferencia]** = razonamiento, hay que probarlo.

## 1. Resumen en 5 líneas

1. **Lista de imágenes: usar SIA2 de IRSA (2,7–5 s), no TAP** (TAP tardó 315 s en una consulta y dio error 502 en otras dos) [medido].
2. **Píxeles: el bucket público S3 de SPHEREx permite CORS y lecturas por rango.** Un recorte ≈ 1 lectura de ~240 KB en ~0,8 s, directo desde el navegador [medido]. Montar el recorte completo desde el WCS en el navegador **no se probó todavía** [inferencia].
3. **El servicio de recortes de IRSA es lento para la web:** 19 s y 4 MB, el 99 % es una tabla PSF que no necesitamos; sin CORS [medido].
4. **SIA, Gaia y JPL no envían CORS** → se necesita un backend delgado (proxy con validación, timeouts y caché) [medido].
5. **El movimiento visible es de ~1–2 píxeles** en toda la serie → zoom, alineación a una rejilla común e imagen diferencia son obligatorios [medido + doc].

## 2. Tabla de hechos

| Qué | Resultado | Cómo |
| --- | --- | --- |
| SIA2 (lista de imágenes) | 2,7 s, 258 filas en WISE 0855 (`spherex_dr1`). Columnas: `t_min`, `em_min/em_max`, `access_url`, `access_estsize`, `s_pixel_scale` | `https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_dr1&POS=circle+133.7951+-7.2451+0.01` |
| Colecciones | `spherex_dr1`, `spherex_dr1_cube`, `spherex_dr1_deep`, `spherex_qr3`, `spherex_qr3_deep` | SIA sin COLLECTION |
| `spherex_qr3` en WISE 0855 | 0 filas; todo vino de DR1 | SIA |
| TAP `spherex.obscore` | 315 s una consulta; 502 en otras | `https://irsa.ipac.caltech.edu/TAP/sync` |
| WISE 0855 por mes (DR1) | may-25: 30 · oct-25: 24 · nov-25: 86 · dic-25: 18 · abr-26: 32 · may-26: 68 → ~3 visitas | SIA + astropy |
| Barnard (DR1) | 240 imágenes: ago–oct 2025 (120) y mar–may 2026 (120) → ~2 visitas | SIA |
| Longitud de onda | 0,7455–5,0096 µm en 6 detectores (D1–D6) | SIA |
| Escala | **6,15″ por píxel** | `s_pixel_scale` |
| Archivo completo | 65,8 MB: IMAGE 2040×2040 float32 sin comprimir, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE | rango de bytes sobre `access_url` |
| Tiempo de la imagen | `MJD-AVG`, `DATE-AVG` en la cabecera de IMAGE; proyección `RA---TAN-SIP` | cabecera FITS |
| Recorte IRSA (0,05°) | 4,05 MB, primer byte 4,4 s, total 19,2 s; solo admite `center` y `size`; sin PNG | `access_url?center=RA,DEC&size=0.05` |
| Copia en S3 | `https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/level2/...` (la ruta IRSA sin `/ibe/data/spherex/`); bytes idénticos | `cmp` |
| CORS en S3 | `Access-Control-Allow-Origin: *`, permite `range`; 28 KB en 0,56 s, 240 KB en 0,80 s | `curl -X OPTIONS` |
| CORS en IRSA (TAP, SIA, recortes) | **Ninguno** | `curl -I -H Origin` |
| HiPS SPHEREx | Cubo de todo el cielo DR1, 102 cortes de longitud de onda, ~6,4″/px, PNG 512 px, **con CORS**. Solo un mapa acumulado: **no hay HiPS por visita** | `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/properties` |
| JPL `sb_ident` (asteroides conocidos en un campo) | 21 s para 1°×1°, 2490 objetos con velocidades. Sin CORS. `obs-time=YYYY-MM-DD`; `mpc-code=500` sirve como aproximación | `https://ssd-api.jpl.nasa.gov/sb_ident.api?...` |
| Gaia DR3 TAP | 3,6 s, 630 estrellas en 0,05° alrededor de Barnard. Sin CORS | `https://gea.esac.esa.int/tap-server/tap/sync` |

## 3. Trampas conocidas

- **La trampa de la longitud de onda (LVF):** cada imagen ve "colores" distintos según la zona del detector. Comparar imágenes de colores distintos crea **cambios falsos**. Regla: en cada época, usar el mismo detector y la longitud de onda más cercana a un valor fijo (columnas `em_min/em_max`) [doc + inferencia].
- **Imágenes rotadas y deformadas** (proyección TAN-SIP): hay que llevar todas las épocas a una rejilla común (astropy `reproject` en el backend, o TAN simple en el navegador aceptando un pequeño error) [inferencia].
- **Brillo de fondo (luz zodiacal):** la extensión `ZODI` permite restarlo; normalizar cada fotograma con estadística robusta (mediana / MAD o *zscale*) [doc + inferencia].
- **Posición de catálogo ≠ posición actual:** las estrellas rápidas ya no están en su posición J2000 (Barnard se movió ~4′). Al buscar por nombre, propagar la posición a la fecha con el movimiento propio (`SkyCoord.apply_space_motion`) [doc].
- **Banderas de calidad:** la extensión `FLAGS` marca píxeles saturados, rayos cósmicos, etc. Mostrarlas en la capa experta (el reto lo sugiere) [doc].
- **Discrepancia por resolver [VERIFICAR]:** el plan del 13-nov (archivado) contó 3–5 épocas por objeto incluyendo QR3 (ago–oct 2026); hoy SIA devuelve QR3 vacío en WISE 0855 y Barnard queda con ~2 visitas en DR1. Revisar QR3 en los 5 objetos antes de prometer más épocas.

## 4. Implicaciones de arquitectura (opciones, no decisiones)

- Un **backend delgado** es inevitable para SIA, Gaia y JPL (sin CORS): validación estricta de RA/Dec y tamaño, timeouts, caché por posición redondeada.
- Los **píxeles** pueden ir: (A) directo S3 → navegador con lecturas por rango (rápido, menos servidor, más complejidad en el navegador), o (B) backend que lee S3 y devuelve un recorte alineado y liviano (más simple en el frontend, más carga de servidor).
- **Respaldo para la demo:** precalcular los 5 objetos de prueba y servirlos estáticos (por si falla IRSA o el wifi).
- **Contexto visual instantáneo:** el HiPS de SPHEREx con Aladin Lite (tiene CORS).

## 5. Riesgos técnicos principales (24 h)

1. TAP lento o caído → usar SIA2 + caché + 5 objetos precalculados.
2. Recortes IRSA lentos y pesados → lectura por rango desde S3; plan B: proxy que llama al servicio de recortes y descarta la tabla EPSF.
3. Movimiento de 1–2 px + imágenes rotadas → rejilla común, zoom con vecino más cercano, imagen diferencia y trayectoria esperada (Gaia) superpuesta.
4. Cambios falsos por longitud de onda → mismo detector y λ más cercana en cada época, normalización robusta, restar ZODI.
5. JPL lento (21 s) → consultar un campo pequeño, solo para la época elegida, y cargar los asteroides después de las imágenes.

## Fuentes

[IRSA SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [Tutoriales SPHEREx](https://caltech-ipac.github.io/irsa-tutorials/spherex/) · [Cutout tool](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html) · [APIs VO de IRSA](https://irsa.ipac.caltech.edu/voapi.html) · [JPL SSD APIs](https://ssd-api.jpl.nasa.gov/) · [Gaia archive](https://gea.esac.esa.int/archive/) · Scripts de la prueba en el equipo de Dax: `/tmp/claude-1000/astro_probe` (fuera del repo).
