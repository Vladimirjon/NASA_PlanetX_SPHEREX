# 11 · Inventario de prototipos y brecha frente a IRSA

Estado: registro de la sesión del 14-nov-2026. Los prototipos están en el equipo local de Dax, fuera del repositorio, y no constituyen un producto aprobado ni disponible automáticamente en los equipos de los demás. Las rutas son locales a esa máquina. No copiar los FITS ni la caché al repositorio Git.

## Respuesta: por qué el globo se ve diferente

El prototipo propio es un experimento inicial, no una réplica del visor de IRSA. Las diferencias conocidas son:

1. **Resolución progresiva incompleta:** el globo usa el atlas reducido de orden 3 cuando el campo es mayor a 10° y teselas de orden 4 cuando es menor o igual. No consulta las teselas de orden 5. El atlas empaqueta cada celda de orden 3 en solo 64×64 píxeles, que se ven grandes al acercarse. La resolución máxima publicada del HiPS llega a orden 5.
2. **Proyección y encuadre distintos:** el prototipo usa una esfera ortográfica que representa direcciones y muestra un hemisferio; la captura de IRSA utiliza una proyección/encuadre diferentes. El campo indicado por cada herramienta no se ha calibrado para que corresponda exactamente. No son capturas equivalentes solo por poner el mismo número en FOV.
3. **Sin renderizado progresivo fluido:** el servidor Python reconstruye una imagen PNG de 960×480 para cada cambio y el navegador espera a recibirla. Al mover o hacer zoom aparecen saltos y esperas. Caltech/Aladin carga y renderiza teselas interactivamente. No hay desplazamiento continuo durante el arrastre en el prototipo.
4. **Calidad de visualización aún no equivalente:** el prototipo remuestrea por vecino más cercano desde los PNG HiPS; no se ha medido equivalencia píxel a píxel, orientación en todas las regiones ni coincidencia exacta de contraste. La visualización se basa en PNG de 8 bits, no en los valores científicos FITS completos. No se debe culpar a los datos sin antes contrastar la implementación.
5. **Controles faltantes:** no hay selección completa de región, capas, soporte de teclado equivalente, zoom fino ni búsqueda general de observaciones temporales. La esfera no indica distancias físicas.

Es técnicamente razonable aspirar a una experiencia visual comparable usando las mismas fuentes, pero **aún no se ha demostrado equivalencia ni una precisión de 99,9999 %**. Para demostrarla hacen falta métricas, muestras de referencia y tolerancias acordadas con ciencia. [Documentación oficial de visualización IRSA](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html) · [Tutorial HiPS IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/).

## Inventario de lo realizado

### A. Demo temporal WISE 0855

- Código y archivos: `~/Desktop/skyshift-demo/index.html`, `app.js`, `style.css`, `server.py`; datos `consulta.xml`, `frame-0-0.fits` … `frame-5-1.fits` y `fuente-1.txt`/`fuente-2.txt`.
- Inicio: `uv run ~/Desktop/skyshift-demo/server.py`; abrir `http://127.0.0.1:8765/`. El servidor escucha en todas las interfaces IPv4, no tiene autenticación y es experimental: solo usar en red confiable. Para detenerlo, Ctrl+C en la terminal que lo ejecuta.
- Muestra dos fechas por cada uno de seis detectores, utilizando una consulta de IRSA guardada y recortes FITS descargados. Reproyecta el segundo a la cuadrícula del primero con Astropy/reproject y permite alternar fechas y ajustar contraste.
- **No** verifica longitud de onda local, FLAGS ni incertidumbre; no identifica positivamente cuál píxel es WISE ni demuestra movimiento. No acepta cualquier región. El mismo detector no garantiza comparabilidad.
- Prueba realizada: seis detectores y 12 imágenes cargaron en navegador. En esta sesión no se ejecutó una validación científica de los pares.

### B. Mapa de referencia con biblioteca Aladin

- `~/Desktop/skyshift-demo/mapa.html`, `mapa.js`, `mapa.css`, servido por el mismo `server.py` en `http://127.0.0.1:8765/mapa.html`.
- Fue creado antes de que Dax precisara que quería un renderizador propio. Utiliza Aladin Lite 3.8.2 y teselas HiPS de IRSA; es una referencia técnica, no el renderizador propio pedido. Su interfaz consulta una celda orden 5 para el centro mediante `/api/cell`.
- Prueba realizada: posición WISE, plano 20 y celda 10226; comparación visual con el visor oficial, sin prueba de igualdad de imagen.

### C. Globo celeste con renderizador propio

- `~/Desktop/skyshift-demo/visor-propio.py` y `~/Desktop/skyshift-demo/propio.html`. Inicio: `uv run ~/Desktop/skyshift-demo/visor-propio.py`; abrir `http://127.0.0.1:8767/`. Escucha en todas las interfaces IPv4 y no tiene autenticación; solo usar en red confiable.
- Python usa NumPy, Astropy, astropy-healpix y Pillow. Convierte la dirección de cada píxel de pantalla a coordenadas celestes mediante proyección ortográfica, calcula celda HEALPix y posición dentro de ella, lee PNG de IRSA y genera la imagen para el navegador. No usa iframe ni Aladin; tampoco reconstruye el mosaico a partir de todas las observaciones originales.
- Panorámica: `Norder3/Allsky.png` o `Allsky_<índice>.png`, 64×64 por celda del atlas. Acercamiento ≤10°: teselas PNG `Norder4`, 512×512. Máximo zoom admitido: FOV 5°; no se implementó `Norder5`.
- La posición local en la tesela se contrastó con el WCS del FITS de la celda 445: x PNG corresponde a `dy` HEALPix y fila PNG a `dx`. Esta comprobación no demuestra toda la precisión de la esfera.
- El PNG de cada petición se produce en el servidor; la rueda modifica el campo de visión y el arrastre actualiza el centro al soltar. El cursor y los polos requieren más pruebas. Las posiciones proyectadas no son distancias tridimensionales.
- La caché `~/Desktop/skyshift-demo/raw-hips/` guarda atlas y teselas solicitados. Al revisar esta sesión contenía **55 archivos, 9,8 MiB**; no hay cuota ni limpieza automática. Se comprueban dimensiones e integridad PNG antes de publicar con reemplazo atómico. No es un sistema completo de caché de producción.
- Pruebas ejecutadas al construirlo: página HTTP 200; plano inválido HTTP 400; navegador sin errores JS ni iframe; rueda cambió FOV de 180° a ~114,77°; arrastre cambió RA de 180° a ~188,98°; una vista de 10° cargó. No se probaron todos los planos, coordenadas ni dispositivos.
- Capturas: `~/Desktop/skyshift-demo/esfera-propia.png`, `visor-propio-verificado.png`. La segunda es una vista acercada. Son capturas de trabajo, no evidencias de igualdad con IRSA.

### D. Índice geométrico reproducible

- Código del repositorio: `scripts/generate-spherex-grid.py`, su `.lock`, `tests/test_spherex_grid.py`, `docs/fuentes/spherex-dr1-hips-properties.txt`; tareas `mise run grid-spherex` y `mise run grid-test`.
- Produce 12.288 celdas NESTED de orden 5, centros y cuatro vértices en RA/Dec y enlaces a los cubos, con un manifiesto y huellas. Los bordes de celdas son curvos: cuatro vértices no son un polígono exacto. No contiene los píxeles ni un índice temporal.
- Copia ya generada localmente: `~/Desktop/skyshift-demo/grid-reproducible/grid.csv` y `manifest.json`. Otro índice previo: `~/Desktop/skyshift-demo/grid-hips/indice-celdas.csv`; no mezclar sus versiones sin comprobar metadatos.
- Se compararon todos los centros con `hpgeom`, cuatro centros y una celda de vértices con HpxFinder oficial, y cuatro millones de coordenadas aleatorias con dos implementaciones HEALPix. No se compararon las 12.288 celdas contra todos los registros oficiales, ni se ha verificado Windows.
- Instrucciones y salidas: `docs/context/10-protocolo-hips-reproducible.md`; revisión de riesgos: `docs/reviews/2026-11-14-grid-hips.md`.

### E. Datos descargados

- `~/Desktop/skyshift-demo/grid-hips/datos-irsa/Norder5/Dir0/Npix445_cube.fits`: cubo completo de referencia IRSA, 320.909.760 bytes, 102×512×512 en `IMAGE`, con `NHITS`, `FLAGS`, `SPECTRAL_CHANNELS` y `WCS-WAVE`. MD5 cotejado con el metadato S3 y SHA-256 local en `Npix445.manifiesto.json`; solo los primeros 8 MiB se compararon con la copia IBE.
- `~/Desktop/skyshift-demo/tercera-visita/`: seis recortes FITS candidatos de 2026 con `manifiesto.json` (fuente, fecha, tamaño y SHA-256). Aún no se integraron ni validaron científicamente como tercera época comparable.
- Se borraron dos pares de duplicados exactos tras cotejar SHA-256 y una descarga parcial tras compararla con el archivo completo. Los FITS conservados permanecen en las rutas anteriores.
- Al revisar esta sesión, `~/Desktop/skyshift-demo` ocupaba alrededor de **392 MiB**. Solo hay un cubo global completo local, no todos los datos de SPHEREx. El estimado de 3,94 TB para 12.288 cubos se basa en extrapolar ese archivo; puede variar.

## Qué falta para igualar y luego mejorar

1. Definir una ficha aprobada para el visor propio, contrato de datos y criterios de paridad; no se ha aprobado un stack de frontend de producto.
2. Diseñar la proyección y cámara con orientación estable; definir campo de visión inequívoco, pan/zoom suave, teclado/táctil y alternativas accesibles.
3. Implementar un motor multirresolución HiPS que elija órdenes 0–5 según cámara y pantalla, cargue solo las teselas visibles, controle límites y permita cancelación. Conservar la proyección y el mapeo de coordenadas de forma verificable. GPU/WebGL es una opción técnica a evaluar, no una garantía de calidad científica.
4. Comparar regiones de referencia con IRSA usando mismas coordenadas, proyección, tamaño de salida, campo de visión, plano y estiramiento. Comprobar bordes de teselas, polos, RA 0°/360°, planos vacíos y carga progresiva; registrar diferencias numéricas y visuales. No confundir reproducir el mosaico con reproducir los FITS originales.
5. Implementar caché acotada con versión, integridad, descarga atómica, control de concurrencia, recuperación y estados sin red. Una caché por backend no se comparte automáticamente entre computadoras.
6. Consultar SIA2 por región y fechas, obtener FITS individuales, verificar λ local, WCS, FLAGS e incertidumbre, alinear y comparar; el mapa HiPS agregado no es un video temporal.
7. Preparar pruebas en Fedora y Windows, auditoría de seguridad/accesibilidad, benchmarks, demo pública y respaldos. La entrega y las decisiones de producto corresponden al equipo.

## Fuentes

- [IRSA: datos y estructura del cubo HiPS](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/).
- [IRSA: visor y coordenadas](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html).
- [IRSA: estructura y reescritura de teselas](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/LAYOUT.md).
- [IVOA: estándar HiPS](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf).
