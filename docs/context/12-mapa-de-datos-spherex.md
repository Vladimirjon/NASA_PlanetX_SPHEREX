# 12 · Mapa de datos SPHEREx y reglas de comparación entre épocas

Estado: revisión física, 14-nov-2026. Base científica de `docs/specs/0002-analizador-temporal.md` (valores **[FÍSICA]**) y `0003-visor-cielo-propio.md`. Etiquetas: **[doc]** = documentación oficial citada · **[medido: cómo]** = probado hoy con datos reales · **[inferencia]** = razonamiento, falta prueba · **[VERIFICAR]** = abierto (§10).

Fuentes principales: [Suplemento Explicativo v2.1, 2026-11-10](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf) (en adelante **ES**) · [IRSA: productos](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-products) · [IRSA: releases](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-releases) · [IRSA: acceso](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access) · [IBE cutouts](https://irsa.ipac.caltech.edu/ibe/cutouts.html) · [Tutoriales IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex). Scripts de medición: fuera del repo (scratch de la sesión), reproducibles con lo descrito en cada **[medido]**.

## 0. Hallazgos que cambian lo que creíamos (leer primero)

1. **Los recortes de la demo de WISE 0855 no contienen a WISE 0855.** Se pidieron en `133.7951, −7.2451`, que es su posición de **2010**. Con su movimiento propio (−8,118″/año en RA) en 2025–26 está ~125″ al oeste: cae en x ≈ −5 px (mayo) o x ≈ +34 px (noviembre) de recortes de 29×29 px. Fuera en los 18 archivos [medido: WCS de cada recorte + posición propagada, §7]. **Regla:** propagar siempre la posición a la fecha antes de pedir el recorte.
2. **Los pares de la demo no son comparables en color.** Mismo detector, pero λ local en el centro muy distinta: D1 0,994 vs 0,861 µm; D3 2,365 vs 1,629 µm; D6 4,969 vs 4,416 µm [medido: WCS-WAVE de cada recorte]. La tolerancia que proponemos (§6) es ~0,5 % de λ.
3. **La imagen gira 180° entre pasadas.** Mayo tiene `SPS_EPA = 180`, noviembre `SPS_EPA = 0` [medido: cabeceras]. También se invierte el gradiente de color del LVF en el cielo: lejos del objetivo, la diferencia de λ entre épocas crece al doble (§6, paso 6).
4. **`WCS-WAVE` con astropy necesita `sip = None`.** Si no se quita, la λ sale mal hasta en 12 nm (D3: 1,6236 vs 1,6294 µm) [medido]. El tutorial oficial también lo quita ([spherex-intro](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/)).
5. **No existe un servicio de recorte del cubo HiPS.** El IBE responde `HTTP 422 "lacks WCS data"` [medido]. Alternativa probada: lecturas por rango en S3. Un espectro de 102 planos sale en 3,4 s [medido, §4.4].

## 1. Productos SPHEREx

| Producto | Qué es | Sirve para | **No** sirve para | Acceso | Tamaño |
| --- | --- | --- | --- | --- | --- |
| **Spectral Image L2 (MEF)** | Una exposición de 113,58 s de un detector: 2040×2040 px a 6,15″/px. Cada fila del detector ve otra λ (LVF) [ES §1.3, §2.2] | **Comparar épocas** (tiene fecha, WCS, FLAGS, VARIANCE) y medir flujo | Mosaicos grandes; "un color fijo" en todo el campo | SIA2 `COLLECTION=spherex_dr1` / `spherex_qr3`; `access_url` (IBE) o `cloud_access` (S3) | ~67 MB [ES §2.2]; 65,8 MB [medido, doc 03] |
| **Recorte L2 (IBE cutout)** | Las mismas 6 extensiones, solo una caja | Bajar solo la zona | Bajo rendimiento: la tabla EPSF ocupa ~3,86 de 3,97 MB (97 %) [medido: 441 filas × 8752 B] | `access_url?center=RA,DEC&size=S` (§1.1) | ~4 MB con 29×29 px [medido] |
| **Deep (L2)** | Mismo formato, campos profundos cerca de los polos eclípticos [ES §1.4] | Más visitas en esas zonas | Cobertura general | `spherex_dr1_deep`, `spherex_qr3_deep` [doc acceso] | ~67 MB |
| **Cubo all-sky DR1 (FITS)** | Mosaico **acumulado** de >1,2 M imágenes DR1. HEALPix orden 5, 12.288 teselas de 512×512 px a 12,9″/px, 102 canales, **ZODI ya restado** [ES §2.5] | Espectro y contexto de una zona (visualización) | **Series temporales** (mezcla todas las fechas); fotometría científica: el tutorial dice "only be used for visualization" ([hipscube](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/)) | `https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/hips5_cube/hips_20261026/Norder5/Dir{N}/Npix{N}_cube.fits` o el mismo path en S3; SIA `spherex_dr1_cube` | 320.909.760 B (Npix445) [medido, doc 10] |
| **HiPS PNG** | Árbol de teselas PNG 512 px, 102 frames, órdenes 0–5. Estiramiento fijo asinh de 0 a 40 MJy/sr [ES §2.5.1; `properties`: `hips_pixel_cut = 0 40`, `hips_pixel_function = asinh`] | Navegar el cielo (visor B) | **Medir cualquier cosa** (§9) | `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/` (con CORS, doc 03) | ~decenas de KB por tesela [inferencia] |
| **QR vs DR** | DR1 = Surveys 1+2 reprocesados con el pipeline R7. QR3 = Surveys 3+4 con el mismo R7. QR2 queda superado y ya no se busca por SIA2 [doc releases; ES §2.1] | DR1 + QR3 se pueden combinar (misma calibración R7) | **No mezclar QR2 con DR1/QR3** (calibraciones distintas) [ES §2.1] | — | — |

Notas:
- **Mosaic tool** de IRSA (`https://irsa.ipac.caltech.edu/applications/spherex/tool-mosaic`): solo interfaz gráfica, **sin API** ([tutorial mosaic](https://caltech-ipac.github.io/irsa-tutorials/spherex-mosaic/)).
- Los Surveys 3 y 4 están desplazados medio canal espectral (6′) respecto de 1 y 2 [ES §1.4, §2.2]. Por eso QR3 muestrea λ distintas a las de DR1 en el mismo punto.
- IRSA publica una imagen solo si `FINAST = 0`, `L2DQA = PASS`, `N_TRANSIENT < 435.000` y está fuera de la Anomalía del Atlántico Sur [ES §3.2.12]. No todas las observaciones traen los 6 detectores. Ejemplo: QR3 de Eps Indi B no tiene D1 ni D4 [medido: SIA].

### 1.1 Servicio de recortes L2 (IBE) — parámetros exactos

`{access_url}?center={RA},{Dec}&size={S}` [doc [cutouts](https://irsa.ipac.caltech.edu/ibe/cutouts.html)]

- `center=x,y[unidad]`: sin unidad = grados ICRS/J2000. Con `px`/`pix`/`pixels` = coordenadas de píxel.
- `size=x[,y][unidad]`: unidades `arcsec`, `arcmin`, `deg` (por defecto), `rad` o `px`. El primer valor va a lo largo de NAXIS1.
- `gzip`: SPHEREx nunca se comprime.
- No hay parámetro para elegir extensiones: siempre devuelve las 6, EPSF incluida.
- Los ejes del recorte son los del detector (no norte arriba). Lo que cae fuera del detector se rellena con NaN.
- Errores: `400` si el parámetro está mal; `500` si el recorte no toca la imagen.
- Medido: 4,05 MB, primer byte en 4,4 s y total en 19,2 s para 0,05°; sin CORS [doc 03].
- **Recorte del cubo:** no existe. `…/Npix445_cube.fits?center=60.81,51.34&size=0.05` → `422 Unable to process the FITS file as it lacks WCS data` [medido].

## 2. Anatomía de un FITS L2

Medido sobre los 18 recortes de `~/Desktop/skyshift-demo` (pipeline `VERSION = 7.0.5`, DR1, `l2b-v27`). Las extensiones coinciden con [ES §2.2].

| HDU | Nombre | Tipo / forma | Unidad | Qué es | Uso nuestro |
| --- | --- | --- | --- | --- | --- |
| 0 | PRIMARY | vacío | — | `VERSION` del pipeline | Procedencia |
| 1 | IMAGE | float32 2040×2040 | `MJy / sr` | Brillo superficial calibrado. **Sin restar ZODI** | Señal |
| 2 | FLAGS | int32 2040×2040 | bits | Máscara por píxel (§3). Nombres en `MSKNnnnn` / `MSKMnnnn` / `MSKDnnnn` | Máscara |
| 3 | VARIANCE | float32 | `MJy2 / sr2` | Varianza por píxel | Incertidumbre |
| 4 | ZODI | float32 | `MJy / sr` | Modelo de luz zodiacal (`ZODIMDL = 'KEL98_WAVESCL_V1'`), **no restado** | Fondo |
| 5 | EPSF | tabla 441 filas (451 en D3) | adimensional | PSF efectiva 33×33, sobremuestreada ×5, por zona del detector. Columnas `BINX`, `BINY`, `XCENTER`, `YCENTER`, `XWIDTH`, `YWIDTH` [px], `NSTAR`, `NEFF_MEAN`, `CWAVE`, `CBAND` [µm], `EPSF` (33,33) | Solo capa experta / fotometría |
| 6 | WCS-WAVE | tabla 1 fila | µm | Rejilla 9×9 de puntos de control: `X`, `Y` (1…2040) y `VALUES` (2,9,9) = λ central y ancho de banda | **λ local** |

### 2.1 Palabras clave de cabecera (IMAGE) que el software debe leer

| Grupo | Keyword (ejemplo medido) | Significado |
| --- | --- | --- |
| Identidad | `DETECTOR = 1` (1–3 SWIR, 4–6 MWIR), `OBSID = '2025W19_1B_0241_1'`, `EXPIDN` | Detector y observación. El mismo `OBSID` aparece en D1 y D4 (y en D2/D5, D3/D6): son simultáneos, un par por divisor dicroico [ES §3.2.8] |
| Tiempo | `TIMESYS='UTC'`, `MJD-BEG`, **`MJD-AVG`**, `MJD-END`, `DATE-AVG`, `XPOSURE = 113.5826 s`, `TELAPSE` | **Usar `MJD-AVG`** (mitad de la exposición). `t_min` y `t_max` de SIA2 = `MJD-BEG` y `MJD-END` [medido: 60800.700028 = MJD-BEG] |
| WCS espacial | `CTYPE = 'RA---TAN-SIP'`, `CRVAL`, `CRPIX`, `PC`, `A_/B_/AP_/BP_` orden 3, `RADESYS='ICRS'` | Píxel ↔ RA/Dec con distorsión SIP. Distorsión máxima ~13 px (~80″) en las esquinas [ES §4.2.2] |
| WCS "A" | `CTYPE1A='LINEAR'`, `CRPIX1A`, `CRPIX2A` (ej. −1061, −547) | Píxel del recorte → píxel del detector original (0-based). Fórmula IRSA: `xpix_orig = 1 + xpix_cutout − CRPIX1A` [doc productos] |
| WCS "W" | `CTYPE1W='WAVE-TAB'`, `PS1_0W='WCS-WAVE'` | λ y ancho de banda por píxel mediante la tabla |
| Calidad | `FINAST` (0 = bien; 1 = esquinas desplazadas un par de px; >1 = no usar), `L1DQAFLG`, `L2DQAFLG`, `ASTRONETSOLVED`, `MATCH_NSTARS` | Rechazar si `FINAST != 0` o `L2DQAFLG != 'Pass'` [ES §3.2.8, §3.2.12] |
| Contadores | `HIERARCH L2 N_TRANSIENT`, `N_PERSIST`, `N_OUTLIER`, `N_SOURCE`, `NBLMSRCS`, `NSNOWSRC`… | Calidad global de la imagen |
| Geometría | `SPS_ELON`, `SPS_ELAT`, `SPS_EPA` (0 o 180) | Dirección planificada. `SPS_EPA` dice el Survey: 0 = S1/S3, 180 = S2/S4 [ES §2.2] |
| PSF | `PSF_FWHM` | FWHM mediana medida por detector: D1 7,53″, D2 7,46″, D3 7,45″, D4 8,67″, D5 8,63″, D6 9,04″ [medido] (~1,2–1,5 px) |
| Píxel | `OMEGA_MEDIAN = 37.86 arcsec²` | √ = 6,153″ por píxel [medido]. Escala local medida con el WCS: 6,13–6,17″/px [medido] |
| Atmósfera | `HE_AG_*`, `AURORA_CORR`, `SHUTTLE_GLOW_CORR` | Contaminación por airglow (He 1,083 µm en D1/D2) |

### 2.2 Cómo obtener la λ de un píxel concreto

1. Pasar de RA/Dec a píxel con el WCS espacial **con SIP**: `WCS(hdr_image).all_world2pix(ra, dec, 0)`.
2. Pasar de píxel a λ con el WCS "W" **sin SIP** (tutorial oficial):
   ```python
   wcs_w = WCS(hdul["IMAGE"].header, fobj=hdul, key="W")
   wcs_w.sip = None
   lam_um, bw_um = wcs_w.pixel_to_world_values(x, y)
   ```
   La interpolación bilineal de la rejilla 9×9 tiene una exactitud de ~1 nm [doc productos]. Medimos ≤0,3 nm de diferencia entre astropy y la interpolación manual.
3. **Precisión:** el ES dice que `WCS-WAVE` sirve "para visualización". Para ciencia, usar `CWAVE`/`CBAND` del producto *Spectral WCS* (~32 MB por detector) [ES §2.2, §4.3.1]. Para elegir pares, 1 nm alcanza: la tolerancia es ≥4,8 nm (§6). [inferencia]
4. **La tabla es fija por detector y versión de calibración.** En los 18 recortes, `VALUES` fue idéntico por detector entre fechas [medido; fuentes `spectral_wcs_{1..4}_v2.2.fits` y `spectral_wcs_{5,6}_v3.0.fits`]. Por eso se puede **calcular la λ local de cualquier imagen leyendo solo su cabecera** (~58 KB por rango en S3) más 6 tablas cacheadas. Así lo hicimos con 1954 imágenes (§5) [medido].
5. Gradiente de λ dentro de un recorte de 29 px, a lo largo del eje y del detector [medido]: D1 −5,6 nm, D2 −8,8, D3 −12,7, D4 −22,2, D5 −8,9, D6 −8,7 nm. Es ≈0,2–0,8 nm/px. En x casi no cambia (≤1,7 nm).

## 3. FLAGS: bits y cuáles enmascarar

Tabla oficial [ES Tabla 16]. En la cabecera de FLAGS de nuestros L2 aparecen los bits 0–28. El bit 29 (`SATELLITE_HALO`) sí está en el cubo [medido]. **Leer siempre los nombres desde `MSKN*` de la cabecera**, no codificar números a ciegas.

| Bit | Nombre | Significado corto | ¿Enmascarar para comparar épocas? |
| --- | --- | --- | --- |
| 0 | TRANSIENT | Rayo cósmico detectado a bordo (también arranque de bloom) | **Sí** |
| 1 | OVERFLOW | Llegó a ~½ del pozo lleno: estrella saturada | **Sí** |
| 2 | SUR_ERROR | Error a bordo / transitorio temprano | **Sí** |
| 6 | NONFUNC | Píxel muerto permanente | **Sí** |
| 7 | DICHROIC | Rendimiento <50 % junto al dicroico (D3 rojo / D4 azul) | **Sí** |
| 9 | MISSING_DATA | Dato perdido en bajada | **Sí** |
| 10 | HOT | Píxel caliente en esta exposición | **Sí** |
| 11 | COLD | Señal anómalamente baja | **Sí** |
| 12 | FULLSAMPLE | Informativo (ventana de lectura completa) | No |
| 14 | PHANMISS | Sin corrección de "phantom" | **Sí** |
| 15 | NONLINEAR | No linealidad no corregible | **Sí** |
| 17 | PERSIST | Persistencia de una fuente brillante anterior | **Sí** |
| 19 | OUTLIER | Píxel aislado anómalo (fuera de fuentes conocidas) | **No enmascarar; marcar** (ver nota) |
| 20 | CROSSTALK | Diafonía eléctrica | **Sí** |
| 21 | SOURCE | Píxel de una fuente conocida del catálogo | **No** (es la estrella que queremos ver) |
| 22 | GHOST | Fantasma óptico de fuente brillante en el campo | **Sí** |
| 23 | GHOST_FPA | Sin uso (absorbido por GHOST_EXT) | Sí (inocuo) |
| 24 | GHOST_EXT | Fantasma de fuente fuera del campo | **Sí** |
| 25 | STREAK | Traza de satélite | **Sí** |
| 26 | BLOOM | Derrame de carga de estrella brillante | **Sí** |
| 27 | SNOWBALL | Evento "bola de nieve" | **Sí** |
| 28 | HALO | Halo de transitorio ("precaución") | **Sí** |
| 29 | SATELLITE_HALO | Halo de satélite | **Sí** |

- Base oficial. Para fotometría el ES recomienda enmascarar `SUR_ERROR, NONFUNC, MISSING_DATA, HOT, COLD, NONLINEAR, PERSIST, BLOOM, SNOWBALL, HALO, SATELLITE_HALO`. Para el fondo agrega `OVERFLOW, OUTLIER, SOURCE, TRANSIENT` [ES §3.3]. El cubo rechaza `TRANSIENT, SUR_ERROR, NONFUNC, DICHROIC, MISSING_DATA, HOT, COLD, PHANMISS, NONLINEAR, PERSIST, CROSSTALK, STREAK, BLOOM, SNOWBALL, HALO, SATELLITE_HALO` [ES §2.5]. **Nuestra máscara de comparación** = la lista del cubo + `OVERFLOW` + `GHOST*` [inferencia: en una diferencia, un fantasma o un píxel saturado crean un cambio falso].
- Máscara entera: `COMPARE_MASK = Σ 2^b` para b ∈ {0,1,2,6,7,9,10,11,14,15,17,20,22,23,24,25,26,27,28,29} = **`0x3FD2CEC7`** (1.070.780.103). Verificar con `MSKM*` al leer el archivo.
- **Nota OUTLIER:** el detector de outliers enmascara antes las fuentes conocidas (SOURCE) y marca lo que sobresale aislado [ES §3.2.10]. Un objeto que se movió o un asteroide no catalogado podría quedar como OUTLIER. Si lo borramos, **borramos el cambio real**. Mostrarlo como capa y bajar el semáforo, sin enmascarar. [inferencia]
- **Nota SOURCE:** el catálogo de máscara incluye objetos conocidos del Sistema Solar [ES §3.2.9]. Que un píxel sea SOURCE no prueba que sea una estrella fija.
- En una zona típica, ~48 % de los píxeles son SOURCE (`PXSRCMSK = 48.19`) [medido]. Por eso no se puede enmascarar SOURCE.
- FLAGS es `int32`: con numpy convertir a `int64` antes de probar el bit 31 [medido: `OverflowError`].

## 4. Cubo HiPS (DR1)

### 4.1 Teselas FITS de orden 5 (`Npix{N}_cube.fits`)

Medido en `Npix445_cube.fits` (abierto solo con memmap):

| HDU | Forma (numpy) | Unidad | Contenido |
| --- | --- | --- | --- |
| PRIMARY | — | — | `VERSION='7.2.0'`, `MJD-BEG/END` y `DATE-BEG/END` de las entradas (Npix445: 2025-08-19 → 2026-02-22), `BLANKCH='D3:17,D4:01'` |
| IMAGE | (102, 512, 512) float32 | `MJy/sr` | Brillo con **ZODI restado** [ES §2.5]. WCS `RA---HPX`/`DEC--HPX` (`PV2_1=4`, `PV2_2=3`), eje 3 `WAVE-TAB`, `ORDER=5`, `NPIX=445`, `WLMIN=0.753`, `WLMAX=4.988` |
| NHITS | (102, 512, 512) int32 | `count` | Píxeles de entrada que aportaron. 0 = sin datos |
| FLAGS | (102, 512, 512) int32 | bits | **OR** de `OVERFLOW`, `SOURCE` y `OUTLIER` de los píxeles que aportaron. FLAGS = 0 con NaN = sin cobertura o canal vacío [ES §2.5] |
| SPECTRAL_CHANNELS | tabla de 102 filas | µm | `DETECTOR`, `SUBCHAN` (1–17), `WAVELENGTH`, `WL_MIN`, `WL_MAX`, `R`, `R_STD`, `BANDWIDTH` |
| WCS-WAVE | tabla de 1 fila | µm | `PLANE` 1–102, `WAVELENGTHS`, `BANDWIDTHS` |

- **Plano ↔ λ:** `índice (0-based) = 17·(detector−1) + (canal−1)`. Los planos 50 y 51 (0-based) están **vacíos** (todo NaN) [medido; ES §2.5.2; `properties.obs_description`]. λ de 0,753 a 4,988 µm.
- **Resolución espectral R** por canal: ~40–41 en D1–D3, ~34–42 en D4, ~112–135 en D5–D6 [medido: columna `R`].
- **Escala:** 12,9″/px (`hips_pixel_scale = 0.0035786°` = 12,88″) [ES §2.5; properties].
- Las teselas cubren todo el periodo DR1 (`t_min = 60789.75`, `t_max = 61174.49` en `properties`). **No es temporal.**
- Problemas conocidos: rayas por airglow (He 1,083 µm en banda 1) y rayas por líneas de nebulosas (Brα 4,052 µm) [ES §2.5.2].

### 4.2 Teselas PNG por orden

Píxel HEALPix de orden k = 58,63°/2^k. Una tesela de 512 px divide eso entre 512 [inferencia geométrica; coincide con `hips_pixel_scale` en orden 5]:

| Orden | Teselas | Tamaño de tesela | Escala por píxel PNG |
| --- | --- | --- | --- |
| 0 | 12 | 58,6° | 412″ |
| 1 | 48 | 29,3° | 206″ |
| 2 | 192 | 14,7° | 103″ |
| 3 | 768 | 7,3° | 51,5″ (`Allsky.png` usa 64×64 por celda: ~412″/px, doc 11) |
| 4 | 3072 | 3,7° | 25,8″ |
| 5 | 12.288 | 1,8° | 12,9″ |

- PNG de 8 bits: 256 niveles. Estiramiento **asinh, corte 0–40 MJy/sr** [ES §2.5.1; properties]. Todo lo que pasa de 40 MJy/sr se recorta y todo lo negativo se vuelve 0. Rango real de los datos: `hips_data_range = −1418.79 … 11348.3` [properties].
- **No medible en PNG:** flujo, colores entre canales, variabilidad, posición subpíxel, ruido. Ninguna diferencia "en el tiempo" (el mosaico no tiene tiempo).

### 4.3 Celda ↔ posición

Ver doc 10 (HEALPix NESTED, nside 32, `Dir = (N // 10000)·10000`).

### 4.4 "Espectro al vuelo" sin bajar 320 MB [medido]

- La parte de datos de IMAGE empieza en el **byte 8640** de Npix445. NHITS empieza en 106.971.840 y FLAGS en 213.940.800 (`fileinfo()['datLoc']`). **Calcular siempre ese desplazamiento leyendo la cabecera**; no fijarlo en el código.
- Valor del plano k en (x, y): byte `datLoc + ((k·512 + y)·512 + x)·4`, big-endian float32 (`>f4`).
- 102 GET con `Range` de 4 bytes contra S3 (16 en paralelo): todos `206`, **3,44 s**, idénticos bit a bit al archivo local.
- Recomendación: hacerlo en el backend y con un recuadro pequeño (no un solo píxel). La fotometría oficial usa apertura y anillo ([hipscube](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/)). El resultado es **solo de visualización**.

## 5. Respuesta SIA2 y agrupación en pasadas

### 5.1 Columnas relevantes [medido en `consulta.xml` con `to_table(use_names_over_ids=True)`]

| Columna | Ejemplo | Uso / trampa |
| --- | --- | --- |
| `obs_id` | `2025W19_1B_0116_1` | Observación (comparten D1/D4, D2/D5, D3/D6) |
| `energy_bandpassname` | `SPHEREx-D3` | **Detector** (no hay columna "detector") |
| `obs_publisher_did` | `ivo://irsa.ipac/spherex_dr1?2025W19_1B_0116_1/D3` | ID único por imagen: clave de caché |
| `t_min`, `t_max` | 60800.700028 | MJD = `MJD-BEG` / `MJD-END` |
| `t_exptime` | 113.5826 s | — |
| `em_min`, `em_max` | 1.6301e-06, 2.4346e-06 (**metros**) | Rango del **detector entero**, **no** la λ local. No sirve para elegir pares |
| `em_res_power` | 40.6 | R |
| `s_ra`, `s_dec`, `s_region`, `s_fov` | POLYGON de 4 vértices; 3,485° | Centro y huella. Filtrar con la huella |
| `s_pixel_scale` | 6.15″ | — |
| `access_url`, `access_estsize` | IBE; 65.791 kB | Descarga y recorte |
| `cloud_access` | JSON `{"aws": {"bucket_name": "nasa-irsa-spherex", "key": "dr1/level2/…"}}` | Lectura por rango en S3 |
| `obs_collection` | `spherex_dr1` | Procedencia |
| `obs_release_date` | 2026-09-27 | — |

### 5.2 Regla de pasadas (visitas)

**Regla:** ordenar todas las imágenes (DR1 + QR3, todos los detectores) por `t_min`. Empezar una pasada nueva cuando el salto con la imagen anterior sea **> 45 días**. Guardar en cada pasada: inicio, fin, duración y colecciones.

Justificación [medido: SIA2 con radio 0,002° en las posiciones propagadas a 2026, 1954 imágenes]:

| Objeto | Mayor salto **dentro** de una pasada | Menor salto **entre** pasadas | Pasadas (fechas medianas) |
| --- | --- | --- | --- |
| Barnard | 25,5 d | 103,5 d | 2025-08-27 (DR1) · 2026-03-17 (DR1) · 2026-08-21 (QR3) |
| Eps Indi B | 17,5 d | 110,8 d | 2025-04-30 · 2025-10-06 · 2026-04-25 (DR1) · 2026-09-27 (QR3, sin D1/D4) |
| WISE 0855 | 26,9 d | 128,8 d | 2025-05-06 · 2025-11-07 · 2026-05-02 (DR1); QR3 vacío |
| RW Aur | 6,2 d | 153,5 d | 2025-09-09 · 2026-03-04 (DR1) · 2026-09-12 (QR3) |
| R Dra | 15,5 d | 87,0 d | 2025-06-14 · 2025-11-30 (DR1) · 2026-06-12 (DR1+QR3 mezclados) |

- 45 d separa con holgura el máximo interno (26,9 d) del mínimo entre pasadas (87,0 d). La física lo explica: la órbita sincronizada con el Sol hace que cada punto sea observable en dos ventanas al año [ES §1.4, Fig. 4].
- Duración de una pasada: 0,8 d (WISE 0855, mayo 2025) hasta 88 d (R Dra, a ~8,6° del polo norte eclíptico) [medido].
- **Aviso:** si una pasada dura más de 100 d, la zona está cerca de un polo eclíptico o de un campo profundo. Entonces la regla puede unir todo en una pasada. Marcarla y mostrar la duración. [inferencia]
- Una pasada puede mezclar colecciones (R Dra 2026: DR1 y QR3). Ambas son R7: se permite, pero se registra la colección por fotograma [ES §2.1].
- Dentro de una pasada hay **varias imágenes por detector** (3–45), cada una con otra λ local. Esto es lo que permite elegir pares de λ casi idéntica (§6).
- Corregir el spec 0002: WISE 0855 ≥3 pasadas ✔; Barnard 3 pasadas ✔.

## 6. Reglas de comparabilidad (algoritmo)

Entrada: RA/Dec, época de referencia, movimiento propio (opcional), detector o λ deseada.

1. **Posición a la fecha.** Si el objeto tiene movimiento propio, propagar la posición al `MJD-AVG` de cada imagen (§7) **antes** de consultar y de recortar. Si no se conoce, avisar: "posición fija; objetos rápidos pueden salir del recorte".
2. **Consulta.** Usar SIA2 en DR1 + QR3 con la posición del centro del intervalo. Descartar imágenes donde el objetivo cae a <15 px del borde del detector [inferencia: medio recorte]. En 1954 imágenes medidas hubo 45 casos (sobre todo R Dra) [medido].
3. **Calidad de la imagen.** `FINAST == 0` y `L2DQAFLG == 'Pass'`. Si no, rechazar con su motivo. En las 1954 imágenes no hubo `FINAST != 0` [medido].
4. **Pasadas.** Aplicar la regla de >45 d (§5.2).
5. **Mismo detector.** Un mismo detector siempre. No mezclar D1 con D4 aunque compartan `OBSID`: son otras bandas.
6. **λ local en el objetivo** (§2.2, sin SIP). Elegir **una imagen por pasada** tal que, frente a la λ de referencia, cumpla **|Δλ| ≤ λ / (4R)**. R de diseño por banda: 39, 41, 41, 35, 112, 128 [ES Tabla payload]. La tolerancia es ≈0,6 % de λ en D1–D4 y ≈0,2 % en D5–D6. Ejemplos: 6,2 nm a 0,97 µm; 22 nm a 3,07 µm; 9,8 nm a 4,37 µm.
   - **Por qué λ/(4R):** el ancho de un canal es λ/R. Con un cuarto, las bandas de ambas imágenes se solapan ≥75 %. Para un espectro suave (Fν ∝ λ^−2), el cambio de flujo por color queda ≈2·Δλ/λ ≤ 1,3 %, por debajo del error sistemático del 3 % que IRSA añade a su fotometría [ES §3.3, ec. 19] [inferencia]. Con objetos de bandas moleculares fuertes (enanas marrones: CH₄, H₂O) el cambio puede ser mayor: ahí es aún más obligatorio [inferencia].
   - **¿Se puede cumplir?** Para cada par de pasadas consecutivas, en casi todos los detectores existe al menos un par con |Δλ| ≤ λ/(4R) (mínimos de 0,0–8,9 nm). Excepciones: Barnard D3 y D6 (mar→ago-26); Eps Indi B D1 (abr→oct-25); WISE 0855 D3 y D6 (may→nov-25, solo 3 imágenes en mayo); R Dra D2 (nov-25→jun-26) [medido]. **Elegir el par que minimiza |Δλ|** dentro de las imágenes del detector, en vez de una λ fija; si se pide una λ, buscar la más cercana a ella. Con ≥3 pasadas, todas deben quedar dentro de la tolerancia **frente a la misma λ de referencia** (sin encadenar).
   - Fuera de tolerancia → `rejected` con motivo `wavelength_mismatch` y Δλ en nm.
7. **λ en el resto del recorte.** Entre Surveys con `SPS_EPA` distinto (0 vs 180), el gradiente del LVF se invierte en el cielo. Por eso, a d píxeles del objetivo, Δλ ≈ 2·g·d (g = 0,2–0,8 nm/px, §2.2). Calcular el **mapa de λ de ambos fotogramas en la rejilla común** y poner NaN donde |Δλ| > tolerancia. En la práctica eso deja un radio útil de ~14–16 px (~90″) alrededor del objetivo [medido: g de los recortes; inferencia: factor 2].
8. **Recorte.** IBE cutout o lectura por rango en S3. Tamaño ≥ 2×(radio útil) + margen de movimiento: **31×31 px (0,053°)** como mínimo [inferencia]. Guardar `CRPIX1A/2A` para ubicar el píxel en el detector.
9. **Rejilla común.** TAN norte arriba, centrada en el objetivo, **6,15″/px**, tamaño impar (como el Mosaic tool, ES §3.4.5). Reproyectar IMAGE, VARIANCE, ZODI, FLAGS y λ.
   - Método: `reproject_interp` bilineal para el blink (visual). Conserva brillo superficial (MJy/sr), no flujo integrado: está bien porque la unidad ya es por estereorradián [inferencia]. Para medir flujo, usar `reproject_exact` (por área) o hacer fotometría en la imagen original sin reproyectar [inferencia].
   - FLAGS: reproyectar por vecino más cercano, o mejor, expandir la máscara: un píxel de salida queda enmascarado si **cualquier** píxel de entrada que lo toca tenía un bit de `COMPARE_MASK` [inferencia].
   - Ojo: el ES usa binning por vecino más cercano (§3.4.6). Nuestro método no es idéntico al oficial; documentarlo en la procedencia.
10. **Fondo.** `S = IMAGE − ZODI` [ES §2.2: ZODI no restado]. Después, restar un fondo local robusto: mediana sigma-clipped de los píxeles válidos no-SOURCE en un anillo (o en todo el recorte). Esto absorbe airglow y luz difusa que ZODI no modela [ES §2.3] [inferencia].
11. **Normalización.** No escalar el flujo entre épocas para "igualar" (borraría la variabilidad real). Solo para la vista: el mismo estiramiento asinh con los mismos límites (percentiles calculados sobre la **unión** de fotogramas) [inferencia]. La calibración absoluta ya es común (MJy/sr).
12. **Diferencia e incertidumbre.** `D = S_B − S_A`, `σ_D = √(VAR_A + VAR_B)` por píxel (interpolar VARIANCE con los mismos pesos; la interpolación correlaciona el ruido, así que σ es aproximada) [inferencia]. Significancia `z = D/σ_D`. Para fotometría de un objeto, sumar 3 % del flujo en cuadratura [ES §3.3 ec. 19].
13. **Semáforo.**
    - **Observado:** cualquier diferencia visible en el blink.
    - **Evaluado** solo si se cumplen **todas** estas condiciones: (a) mismas coordenadas propagadas; (b) pasadas distintas (>45 d); (c) mismo detector; (d) |Δλ| ≤ λ/(4R) en el objetivo; (e) `FINAST = 0` y `L2DQA = Pass`; (f) ningún bit de `COMPARE_MASK` en un radio de 2,5 px del objetivo en ninguna época (es el radio que IRSA usa para `CONTAINS_BAD_PIXEL`, ES §3.3); (g) |z| ≥ 5 en ≥2 píxeles contiguos del objetivo [inferencia: umbral estándar para evitar falsos por ruido]; (h) procedencia completa (archivo, `MJD-AVG`, detector, λ, colección, versión).
    - Para un **movimiento**, además: el desplazamiento medido (centroide) coincide con el predicho (§7) dentro de **max(0,5″, 3σ_centroide)** [inferencia: astrometría <0,3″ RMS, ES §4.2.2].
    - **Nunca "Confirmado"**: lo asigna un humano con evidencia externa.

## 7. Los 5 objetos de prueba

Fórmula de posición a la fecha t (aproximación de plano tangente; válida para desplazamientos ≪1°) [inferencia, estándar]:

```
Δt = (MJD-AVG → año juliano) − época_ref            # años
Δα* = μα*·Δt − ϖ·(R⊕ · ê_α)                          # mas; μα* = μα·cos δ
Δδ  = μδ ·Δt − ϖ·(R⊕ · ê_δ)
α = α0 + Δα*/cos δ0 ;  δ = δ0 + Δδ
ê_α = (−sin α, cos α, 0) ;  ê_δ = (−sin δ cos α, −sin δ sin α, cos δ)
R⊕ = posición baricéntrica de la Tierra en UA (astropy get_body_barycentric)
```

- SPHEREx está en órbita baja (~7000 km): respecto a la Tierra, su paralaje es ~5×10⁻⁵ UA, despreciable [inferencia].
- Para Barnard, la propagación rigurosa (`SkyCoord.apply_space_motion` con velocidad radial) difiere de la lineal en solo 0,06–0,07″ (≈0,01 px) [medido]. Aun así, se recomienda `apply_space_motion` en el backend.

| Objeto | Posición de referencia (ICRS) | Época | μα*, μδ (mas/año) | ϖ (mas) | Fuente |
| --- | --- | --- | --- | --- | --- |
| Barnard | 269,44850253, +4,73942005 | J2016,0 | −801,551 ± 0,032, +10362,394 ± 0,036 (total 10,393″/año) | 546,976 ± 0,040 | Gaia DR3 4472832130942575872 [medido: IRSA SCS `gaia_dr3_source`] |
| Eps Indi B | 331,07645260, −56,79381207 | J2016,0 | +3981,977 ± 0,602, −2466,832 ± 0,626 (4,684″/año) | 270,658 ± 0,690 | Gaia DR3 6412596012146801152 [medido]. Es binaria Ba+Bb: Gaia da el fotocentro [VERIFICAR] |
| WISE 0855 | 133,7952573, −7,2450910 (posición WISE medida) | MJD 55320,38 (2010,34) | −8118 ± 8, +680 ± 7 (8,146″/año) | 449 ± 8 (2,23 pc) | [Luhman & Esplin 2016, Tablas 2 y 4](https://arxiv.org/abs/1605.06655). No está en Gaia. CatWISE2020 da −8,02/+1,04″/año, compatible [medido] |
| RW Aur (A) | 76,95608120, +30,40120459 | J2016,0 | +2,641, −27,398 | 6,406 | Gaia DR3 156430822114424576 [medido] |
| R Dra | 248,16737837, +66,75500675 | J2016,0 | −20,643, +6,149 | 1,251 | Gaia DR3 1648328016354496384, `phot_variable_flag = VARIABLE` [medido] |

Desplazamiento esperado entre pasadas medidas (movimiento propio + paralaje; fechas = mediana de cada pasada) [medido: fórmula de arriba sobre la lista SIA2]:

| Objeto | Par de pasadas | Δt (años) | Desplazamiento | En píxeles (6,15″) | ¿Visible en blink? |
| --- | --- | --- | --- | --- | --- |
| Barnard | ago-25 → mar-26 | 0,55 | 5,64″ | 0,92 | Apenas: dipolo de ~1 px. Satura (abajo) |
| Barnard | ago-25 → ago-26 (QR3) | 0,98 | 10,24″ (casi todo en Dec) | 1,67 | **Sí**, el mejor caso |
| Barnard | mar-26 → ago-26 | 0,43 | 4,80″ | 0,78 | Apenas |
| Eps Indi B | abr-25 → oct-25 | 0,44 | 1,91″ | 0,31 | No a simple vista; solo centroide |
| Eps Indi B | abr-25 → abr-26 | 0,99 | 4,60″ | 0,75 | Apenas |
| Eps Indi B | abr-25 → sep-26 (QR3) | 1,41 | 6,47″ | 1,05 | Sí (dipolo de ~1 px), solo en D2/D3/D5/D6 |
| WISE 0855 | may-25 → nov-25 | 0,51 | 3,26″ (sin paralaje serían 4,14″) | 0,53 | No a simple vista |
| WISE 0855 | may-25 → may-26 | 0,99 | 8,05″ (casi todo en RA, hacia el oeste) | 1,31 | Sí, si se detecta (abajo) |
| WISE 0855 | nov-25 → may-26 | 0,48 | 4,79″ (sin paralaje, 3,91″) | 0,78 | Apenas |
| RW Aur | cualquier par | ≤1,0 | ≤0,03″ | 0,00 | No se mueve: solo brillo |
| R Dra | cualquier par | ≤1,0 | ≤0,02″ | 0,00 | No se mueve: solo brillo |

- **El paralaje sí importa en WISE 0855:** cambia el salto de medio año en ~±0,9″ (0,15 px). Barnard y Eps Indi B, en ~0,3″ y ~0,2″. Incluirlo en la trayectoria esperada.
- Separación esperada > FWHM/2 (~0,6–0,75 px) solo en los pares de ~1 año. En pares de medio año el cambio es **subpíxel**: hay que mostrarlo como "posición medida vs predicha", no esperar que el ojo lo vea [inferencia].
- **Saturación** (límite de no linealidad: 11,5 AB en bandas 1–2, 11,3 en 3, 11,7 en 4, 10,2 en 5, 9,75 en 6 [ES Tabla 25]). Usando 2MASS [medido: IRSA SCS `fp_psc`] y Vega→AB Ks +1,85 / W2 +3,34 [VERIFICAR conversión]:
  - **Barnard** Ks = 4,52 (≈6,4 AB): satura mucho. Núcleo OVERFLOW/NaN, bloom, persistencia. Medir posición por el ajuste del ala de la PSF o por la máscara, no por el pico.
  - **R Dra** Ks = 2,44 (calidad D): satura muchísimo. No sirve para fotometría con nuestras herramientas.
  - **RW Aur** Ks = 7,02 (≈8,9 AB): satura en bandas 1–4.
  - **Eps Indi B** Ks = 11,21 (≈13,1 AB), W2 = 9,49 (≈12,8 AB, AllWISE): **no satura**. Es el mejor caso limpio.
  - **WISE 0855:** casi invisible en <2 µm. W2 ≈ 13,9 Vega (≈17,2 AB) [VERIFICAR]. Detectable, como mucho, en D5/D6 por imagen individual [VERIFICAR con las imágenes].
- **Variables:**
  - **R Dra:** tipo Mira (pulsante de periodo largo), P ≈ 246 d, V 6,7–13,2 ([VSX oid 13673](https://www.aavso.org/vsx/index.php?view=detail.top&oid=13673); VSX bloqueó la API automática, valor de listas que la citan). Amplitud en IR mucho menor que en V (típico ~1 mag en K para Miras) [VERIFICAR]. Entre pasadas separadas ~170 d (≈0,7 periodos) se espera un cambio de brillo real. La fase exacta en cada fecha requiere la curva de luz [VERIFICAR].
  - **RW Aur A:** T Tauri clásica con eclipses por polvo irregulares. Bajadas de ~2–3 mag en V (2010; 2014–16) y variabilidad fuerte e impredecible hasta 2020. Durante los mínimos aparece emisión IR extra de polvo a 500–700 K ([Koutoulaki+2019](https://arxiv.org/abs/1903.06423); [arXiv:2312.17598 (2023)](https://arxiv.org/abs/2312.17598)). Amplitud en 1–5 µm en 2025–26: **desconocida** [VERIFICAR]. Es binaria (RW Aur B a ~1,4″): no se resuelve con píxeles de 6″ [VERIFICAR separación].
  - En ambos casos el semáforo solo puede llegar a "Evaluado" con λ igual (§6). Además el objeto satura, así que el cambio en el núcleo puede ser artefacto: mirar las alas o bandas donde no sature.

## 8. Trampas que fabrican cambios falsos

| Trampa | Por qué pasa | Cómo detectarla / evitarla |
| --- | --- | --- |
| **LVF (λ distinta)** | Cada fila del detector ve otro color; dos fechas = otro color | §6 pasos 6–7: Δλ en el objetivo y mapa de Δλ en el recorte |
| **Rotación 180° y gradiente invertido** | `SPS_EPA` 0 vs 180 entre pasadas [medido] | Reproyectar siempre; mapa de Δλ |
| **Posición vieja del catálogo** | Objetos rápidos salen del recorte (le pasó a la demo, §0) | Propagar a `MJD-AVG` |
| **Bordes** | Distorsión de hasta ~13 px en esquinas; FINAST=1 desplaza un par de px; NaN fuera del detector [ES §4.2.2, §3.2.8] | Distancia al borde ≥15 px; `FINAST == 0`; enmascarar NaN |
| **Rayos cósmicos / snowballs / halos** | En cada imagen; halos sin flag alrededor [ES §2.3] | Máscara de bits 0, 2, 27, 28; exigir que el cambio aparezca en ≥2 imágenes de la misma pasada (hay 3–45 por detector) |
| **Persistencia** | Una estrella brillante deja "eco" en la exposición siguiente. El siguiente apuntado se mueve ~1 canal (~120 px) [inferencia: 2040/17] | Bit 17; desconfiar de fuentes nuevas cerca de estrellas brillantes |
| **Saturación y bloom** | Barnard, R Dra y RW Aur saturan (§7) | Bits 1, 26; no medir el pico |
| **Diafonía** | Imagen negativa a ~32 filas; copias cada 64 columnas [ES §2.3] | Bit 20; patrón a 32/64 px de una estrella brillante |
| **Fantasmas ópticos y luz de la Luna** | Anillos de ~10′, fantasmas lineales y de borde, "8° ghost" [ES §2.3] | Bits 22–24; nunca valorar un cambio extendido |
| **Píxeles calientes/fríos** | Varían por exposición [ES Tabla 16] | Bits 10, 11, 6 |
| **Airglow (He 1,083 µm), aurora, shuttle glow** | Fondo variable por órbita; rayas [ES §2.3] | `HE_AG_*`/`AURORA_CORR`; restar fondo local; evitar canales ~1,08 µm en D1/D2 |
| **Satélites** | Trazas con STREAK / SATELLITE_HALO; las débiles pueden no estar marcadas [ES §2.3] | Bits 25, 29; morfología alargada |
| **Asteroides y cometas** | Cambio real, pero no del objeto: aparece en una sola época. La máscara SOURCE incluye objetos conocidos del Sistema Solar [ES §3.2.9] | Consultar JPL `sb_ident` en la fecha y el campo (doc 03); etiquetar "objeto del Sistema Solar conocido" |
| **OUTLIER** | Puede marcar un cambio real (§3) | No enmascarar; capa experta |
| **Interpolación** | Suaviza y desplaza picos en subpíxel | Vecino más cercano en el zoom; medir en la imagen original |
| **Estiramiento distinto** | Contraste distinto parece cambio de brillo | El mismo estiramiento para toda la serie (§6 paso 11) |
| **Mezclar QR2** | Otra calibración [ES §2.1] | Solo DR1 + QR3 |

## 9. Ciencia (FITS) vs solo visualización (PNG)

- **Medible:** solo valores de FITS en float32: IMAGE, VARIANCE, ZODI, FLAGS (L2) y las teselas FITS del cubo (con la advertencia de que el espectro del cubo es "de visualización" según IRSA).
- **Nunca medir sobre:** PNG HiPS (8 bits, asinh, recorte 0–40 MJy/sr); `Allsky.png`; capturas; PNG o canvas que genere nuestro frontend.
- Regla de contrato: toda cifra mostrada (flujo, Δ, σ, posición) viene de un endpoint que leyó FITS. El frontend solo **colorea** Float32 que ya recibió (spec 0002: "Float32 little-endian, NaN = enmascarado"). Si un dato viene de PNG, la UI lo rotula "solo visualización".

## 10. [VERIFICAR] abiertos

1. **Crítico:** precisión de `WCS-WAVE` frente a `CWAVE` (producto Spectral WCS) en el píxel del objetivo. Bajar un archivo `spectral_wcs_D*` y comparar. Si difiere >1 nm, usar CWAVE en el backend.
2. **Crítico:** ¿se detecta WISE 0855 en D5/D6 en imágenes individuales? Recortar en la posición **propagada** y medir S/N.
3. **Crítico:** que el centroide de Barnard (saturado) siga el movimiento predicho dentro de 0,5″. Si no se logra, usar Eps Indi B como caso principal de movimiento.
4. Umbrales elegidos por nosotros, a validar con ciencia: tolerancia λ/(4R), |z| ≥ 5, 2,5 px, borde 15 px, 45 d.
5. Para Barnard, D3 y D6 no tienen par dentro de la tolerancia entre mar-26 y ago-26. Decidir si se permite λ/(2R) solo como "Observado".
6. Amplitud IR y fase actuales de R Dra y RW Aur en 2025–26 (AAVSO / literatura). VSX no respondió a la consulta automática.
7. Magnitudes AB de WISE 0855 (W2) y la conversión Vega→AB usada.
8. Si el cubo FITS se actualiza (versión `hips_20261026`): fijar la versión en la caché.
9. ¿`FLAGS` del L2 de QR3 incluye el bit 29 en la cabecera? En DR1 v7.0.5 no aparecía `MSKN0029` [medido].
10. Eps Indi B: separación Ba–Bb y efecto del fotocentro; RW Aur A–B: separación. Ambas sin resolver a 6″.
11. Exactitud de `reproject_interp` frente a binning oficial para la diferencia: medir el residuo en estrellas fijas del recorte (debería ser ~0 dentro de σ).
