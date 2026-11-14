# Glosario (lenguaje simple)

| Término | Qué es |
| --- | --- |
| **Ascensión recta (RA)** | "Longitud" del cielo, medida alrededor del ecuador celeste; en horas (24 h = 360°) o grados |
| **Declinación (Dec)** | "Latitud" del cielo: grados al norte (+) o al sur (−) del ecuador celeste |
| **Segundo de arco (″)** | 1/3600 de grado. Un píxel de SPHEREx mide 6,15″ |
| **Época** | Una pasada del telescopio por la misma zona del cielo; SPHEREx hace una cada ~6 meses |
| **Infrarrojo** | Luz de longitud de onda más larga que el rojo; invisible al ojo, la emiten objetos fríos |
| **Longitud de onda (λ)** | El "color" de la luz; SPHEREx mide de 0,75 a 5 µm (micrómetros) |
| **Espectro** | Brillo de un objeto en cada color; su "huella digital" |
| **LVF (filtro lineal variable)** | Filtro tipo tira de arcoíris: cada zona del detector ve un color distinto |
| **Detector D1–D6** | Los 6 sensores de SPHEREx; cada uno cubre un rango de colores |
| **Movimiento propio** | Desplazamiento real de una estrella en el cielo con los años (″/año) |
| **Paralaje** | Vaivén anual aparente de una estrella cercana causado por la órbita de la Tierra |
| **Estrella variable** | Estrella que cambia de brillo con el tiempo |
| **Enana marrón** | "Estrella fallida": muy fría, brilla sobre todo en infrarrojo |
| **Asteroide** | Roca del Sistema Solar; se mueve rápido y aparece en una sola época |
| **Blink** | Alternar rápido dos o más imágenes alineadas para que el ojo note el cambio |
| **Imagen diferencia** | Imagen B menos imagen A; lo que no cambió se cancela |
| **Dipolo** | Pareja negro/blanco en una diferencia: señal de que algo se movió |
| **Artefacto** | Falso cambio: rayo cósmico, píxel caliente, borde, reflejo |
| **FITS** | Formato estándar de imágenes astronómicas: píxeles + cabecera con metadatos |
| **WCS** | Información en el FITS que traduce un píxel a una posición RA/Dec |
| **Reproyectar** | Llevar imágenes con orientaciones distintas a una rejilla común para compararlas |
| **FLAGS** | Capa del FITS que marca píxeles problemáticos (saturados, rayos cósmicos…) |
| **Luz zodiacal (ZODI)** | Brillo difuso del polvo del Sistema Solar; SPHEREx lo entrega para restarlo |
| **Estiramiento asinh** | Forma de ajustar el contraste para ver a la vez objetos débiles y brillantes |
| **HiPS** | Formato de mosaicos del cielo (como los de Google Maps) para visores como Aladin |
| **IRSA** | Archivo de NASA/IPAC donde están los datos de SPHEREx |
| **SIA / TAP** | Protocolos estándar para buscar imágenes (SIA) o consultar tablas con SQL (TAP) |
| **DR1 / QR3** | Versiones de datos de SPHEREx: DR1 = primera publicación oficial; QR = publicaciones rápidas |
| **Gaia DR3** | Catálogo de la ESA con posiciones y movimientos de ~1800 millones de estrellas |
| **JPL sb_ident** | Servicio de NASA/JPL que dice qué asteroides conocidos había en una zona y fecha |
| **Magnitud** | Escala de brillo invertida: número mayor = más débil; +5 magnitudes = 100 veces más débil |
| **UA (unidad astronómica)** | Distancia Tierra–Sol (~150 millones de km) |
| **Planet Nine / Planet X** | Planeta hipotético más allá de Neptuno; no observado |
| **Pasada (visita)** | Grupo de imágenes de la misma zona tomadas en una misma ventana de observación (días a semanas). Entre dos pasadas hay >45 días; cada pasada es una época |
| **MJD** | Fecha juliana modificada: número de días continuo (ej. 60801,5 = 6-may-2025). En SPHEREx usamos `MJD-AVG`, la mitad de la exposición |
| **Época de referencia (J2016,0)** | Fecha a la que corresponde una posición de catálogo. Gaia DR3 da posiciones para 2016,0; hay que moverlas a la fecha de cada imagen |
| **ICRS** | El sistema de coordenadas celestes estándar (RA/Dec) que usan SPHEREx y Gaia |
| **Canal espectral** | Cada uno de los 17 "colores" por detector (102 en total) en que SPHEREx divide su rango |
| **Poder resolutivo (R)** | Qué tan fino separa colores: R = λ/Δλ. SPHEREx: ~40 en D1–D4 y ~120 en D5–D6 |
| **MJy/sr** | Unidad de brillo superficial (brillo por área de cielo) de las imágenes SPHEREx |
| **Varianza (VARIANCE)** | Capa del FITS con la incertidumbre al cuadrado de cada píxel; su raíz es el error σ |
| **SIP (TAN-SIP)** | Polinomio que corrige la deformación óptica de la imagen dentro del WCS |
| **WCS-WAVE** | Tabla del FITS que dice qué longitud de onda ve cada píxel; aproximada (~1 nm) |
| **PSF / FWHM** | La forma en que una estrella puntual se "mancha" en la imagen; FWHM es su ancho (~7,5–9″, 1,2–1,5 px en SPHEREx) |
| **Saturación (OVERFLOW)** | Píxel tan iluminado que deja de medir bien; las estrellas muy brillantes se "queman" |
| **Bloom** | Carga que se derrama de un píxel saturado a sus vecinos |
| **Persistencia** | "Eco" de una estrella brillante que queda en el detector en la exposición siguiente |
| **Snowball / halo** | Impacto de partícula muy energético que ilumina un grupo de píxeles y su alrededor |
| **Diafonía (crosstalk)** | Copias falsas de una estrella brillante creadas por la electrónica de lectura |
| **Dicroico** | Espejo que separa luz corta (D1–D3) y larga (D4–D6); sus bordes tienen poca sensibilidad |
| **Airglow** | Brillo de la alta atmósfera (ej. helio a 1,083 µm) que contamina algunas imágenes |
| **FINAST** | Indicador de calidad de la astrometría del FITS: 0 = buena; otro valor = no usar |
| **Survey / PA** | SPHEREx gira 0° o 180° según la mitad de la órbita (Survey 1/3 vs 2/4); entre pasadas la imagen puede salir rotada |
| **HEALPix** | Forma de dividir la esfera del cielo en celdas de igual área; base del HiPS |
| **NHITS** | Capa del cubo HiPS: cuántos píxeles de imágenes originales se promediaron en cada píxel |
| **Recorte (cutout)** | Trozo pequeño de una imagen grande, pedido por posición y tamaño |
| **Lectura por rango (S3)** | Bajar solo unos bytes de un archivo grande en la nube, sin descargarlo entero |
| **Magnitud AB / Vega** | Dos escalas de magnitud con distinto cero; hay que convertir antes de comparar |
| **Variable Mira** | Estrella gigante que pulsa con periodo largo (meses) y gran cambio de brillo (ej. R Dra) |
| **T Tauri** | Estrella muy joven rodeada de un disco de polvo que la tapa a ratos (ej. RW Aur) |
| **Centroide** | Posición del "centro de luz" de una estrella; permite medir movimientos menores a 1 píxel |
