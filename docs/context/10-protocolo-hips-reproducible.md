# 10 · Protocolo experimental reproducible de HiPS SPHEREx

Estado: investigación, 14-nov-2026. No sustituye una ficha aprobada ni el backend de producto. La persona que ejecute el proceso debe guardar sus propios resultados y la versión de datos usada.

## Qué se reproduce

IRSA ya distribuye el mapa del cielo como HiPS: una cuadrícula HEALPix anidada con 12.288 celdas de orden 5. Las imágenes panorámicas PNG sirven para visualizar, y los cubos FITS de 102 planos conservan los datos agregados. **El cubo no contiene una secuencia temporal:** para buscar observaciones por fecha se necesitan las imágenes espectrales individuales y SIA2. [Tutorial IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/) · [Suplemento SPHEREx §2.5](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf).

Versión investigada: colección DR1, `hips_20261026`, marco ecuatorial, orden 5, nside 32. Propiedades oficiales: `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/properties`. En la instantánea examinada el SHA-256 fue `65f3bda2c1ba582989da7e2e5324fd8b7ad50823580554aae432be45ae05745f`. **El contenido de esa URL puede cambiar**: conservar una copia y su hash, y no mezclarla silenciosamente con una ruta de otra versión.

### Relación entre posición y cubo

Para RA/Dec en grados ICRS y orden 5, calcular la celda HEALPix `NESTED` con nside 32. La carpeta es `Dir{(celda // 10000) * 10000}` y el archivo `Npix{celda}_cube.fits`, bajo:

`https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/hips5_cube/hips_20261026/Norder5/`

No se debe elegir la celda por cercanía al centro: usar la función geométrica HEALPix. Una búsqueda de área debe incluir **todas las celdas que se intersectan**, no solo la celda del centro.

Pruebas de referencia: RA 60,8109955°, Dec 51,3404038° → celda 445 (tutorial IRSA); RA 133,7951°, Dec −7,2451° → celda 10226. Los valores de coordenadas sobre bordes exactos requieren especial atención y pruebas; centros y puntos al azar no garantizan esos casos.

## Reproducir la comparación geométrica

Guardar el bloque como `comparar-hips.py` y ejecutar con `uv run comparar-hips.py`. Las dependencias directas se fijan en el archivo; el resultado depende también de las dependencias transitivas, plataforma y runtime, por lo que esto es un experimento, no un entorno completamente fijado mediante lockfile.

```python
# /// script
# requires-python = ">=3.13"
# dependencies = ["astropy==8.0.2", "astropy-healpix==1.1.3", "hpgeom==1.7.1", "numpy==2.5.4"]
# ///
import astropy.units as u
from astropy_healpix import HEALPix
import hpgeom
import numpy as np

healpix = HEALPix(nside=32, order="nested")
ids = np.arange(healpix.npix)
lon, lat = healpix.healpix_to_lonlat(ids)
assert np.array_equal(ids, hpgeom.angle_to_pixel(32, lon.degree, lat.degree, nest=True, lonlat=True))
assert int(healpix.lonlat_to_healpix(60.8109955 * u.deg, 51.3404038 * u.deg)) == 445
rng = np.random.default_rng(1801)
errors = 0
for _ in range(4):
    ra = rng.uniform(0, 360, 1_000_000)
    dec = np.degrees(np.arcsin(rng.uniform(-1, 1, 1_000_000)))
    first = healpix.lonlat_to_healpix(ra * u.deg, dec * u.deg)
    second = hpgeom.angle_to_pixel(32, ra, dec, nest=True, lonlat=True)
    errors += int(np.count_nonzero(first != second))
print(f"Centros: {len(ids)}; posiciones aleatorias: 4000000; discrepancias: {errors}")
assert errors == 0
```

En esta máquina, dos implementaciones coincidieron en 12.288 centros y 4.000.000 de posiciones aleatorias. Esta evidencia solo prueba acuerdo geométrico de la muestra; no demuestra 99,9999 % de precisión astrométrica, cobertura de bordes, igualdad visual ni exactitud de toda la app. Definir tolerancia angular, datos de referencia y métricas de calidad con ciencia antes de reclamar precisión.

## Visualización, límites y descarga

El [visor oficial del cubo](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/) utiliza Aladin Lite y 102 planos. Su código público usa selección por frecuencia y advierte que `setSliceNumber` puede no reproducir el mapeo; verificar orientación de índices, longitud de onda y los planos vacíos 50/51 en índice desde cero (51/52 en interfaz) contra propiedades y FITS. La escala declarada por `hips_pixel_scale=0.0035786°` es aproximadamente 12,88″/píxel; no confundir con la escala de las imágenes individuales (~6,15″/píxel).

El `HEAD` del cubo de ejemplo 445 informó 320.909.760 bytes. Multiplicar este tamaño por 12.288 celdas da aproximadamente 3,94 TB decimales, solo como estimación; los tamaños deben medirse. Este equipo tenía unos 86 GB libres. No iniciar un espejo completo en ese disco. Elegir áreas, fijar una cuota y descargar bajo demanda; comprobar espacio, tasa y condiciones de IRSA.

Las descargas deben usar archivo temporal, reanudación verificable, validación FITS y escritura atómica. Conservar URL, fecha, tamaño, versión y hash; un SHA-256 calculado localmente permite comprobar cambios posteriores, pero sin un hash de referencia confiable no demuestra identidad con el original. Para validar equivalencia, comparar metadatos y contenido contra una fuente oficial verificable. Respetar límites del servicio, sin pruebas masivas simultáneas.

La copia parcial del experimento está en `~/Desktop/skyshift-demo/grid-hips/`; los datos locales no se incluyen en Git. El catálogo temporal, el visor comparable y la caché compartida todavía no están implementados.

## Cubo de referencia descargado

En el experimento local se descargó `Npix445_cube.fits` desde [la copia S3 de IRSA](https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/hips5_cube/hips_20261026/Norder5/Dir0/Npix445_cube.fits). Tamaño: 320.909.760 bytes. El MD5 coincide con el metadato y ETag de S3 (`98bdb7c42bf99bfb27d45587605a196f`); SHA-256 local: `f098a04d2fed64a051eaf56444c2f18fad84bd9bd1e15b1f964337a9a4139f31`. Astropy reconoció `PRIMARY`, `IMAGE`, `NHITS`, `FLAGS`, `SPECTRAL_CHANNELS` y `WCS-WAVE`; `IMAGE` tiene forma (102, 512, 512). Los primeros 8 MiB coincidieron también con el archivo IBE de IRSA; no se comparó el resto del archivo IBE byte por byte.

Para descargar **solamente este cubo** en una carpeta de trabajo de otro equipo, con conexión y espacio suficiente:

```text
curl --fail --location --retry 2 --output Npix445_cube.fits https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/hips5_cube/hips_20261026/Norder5/Dir0/Npix445_cube.fits
```

La verificación de producción debe contrastar el tamaño y el MD5 de este objeto contra los metadatos oficiales, además de abrir y validar FITS; este comando por sí solo no efectúa dichas verificaciones. La descarga completa automatizada y su reanudación segura siguen pendientes de implementar y revisar.

## Generador reproducible del equipo

La utilidad `scripts/generate-spherex-grid.py` genera las 12.288 celdas de orden 5 a partir de la instantánea versionada `docs/fuentes/spherex-dr1-hips-properties.txt`. Los centros y cuatro vértices están en grados ICRS; incluye enlaces a FITS y un manifiesto con origen y huellas. Los vértices son muestras: los límites HEALPix son curvos y no deben tratarse como polígonos planos exactos. El índice no contiene imágenes, cobertura verificada ni fechas individuales.

Con el entorno del proyecto instalado:

```text
mise run grid-spherex
mise run grid-test
```

La salida es `spherex-grid/`, ignorada por Git. La generación se niega si el destino ya existe: moverlo o elegir otro destino antes de repetir. Para un destino personalizado, ejecutar `uv run --locked --script scripts/generate-spherex-grid.py --output <directorio-nuevo>`; el directorio padre debe existir. El script usa su lockfile y no descarga datos de la red. No ejecutar generadores simultáneos sobre el mismo destino: la protección frente a reemplazo concurrente no está garantizada. La reproducibilidad byte a byte se ha probado en este entorno; falta verificar Fedora y Windows en CI.

La comprobación compara los centros de todas las celdas con `hpgeom` y cuatro posiciones con [HpxFinder oficial de IRSA](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/HpxFinder/Norder5/Dir0/Npix445), que entrega sus centros redondeados a seis decimales. Esto no es una verificación exhaustiva contra 12.288 registros de IRSA y no determina una tasa de error astrométrico de la aplicación.

## Prototipo visual local (14-nov-2026)

En `~/Desktop/skyshift-demo/mapa.html` existe un experimento local, fuera del repositorio de producto. Usa Aladin Lite 3.8.2 y teselas HiPS de IRSA por red; no es un espejo local ni un visualizador sin conexión. Permite navegar por el mosaico, seleccionar uno de los 102 planos espectrales y consultar la celda HEALPix de orden 5 del centro. El plano es espectral, no temporal; el índice local de geometría y el catálogo temporal no se han integrado como una búsqueda completa de observaciones.

Para una comparación visual reproducible se probaron RA 133,7951°, Dec −7,2451°, FOV 5°, plano 20 (índice 19; 1,167 µm), tanto en el experimento como en [el visor de Caltech con los mismos parámetros](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/?ra=133.7951&dec=-7.2451&fov=5&frame=19&hideProperties). Capturas locales: `mapa-verificado.png` y `caltech-referencia.png`. Son referencias visuales, no prueba de igualdad píxel a píxel; el FOV vertical y el contraste de las capturas difieren.

La prueba de navegador cargó el mapa, cambió el plano, centró coordenadas y recibió celda 10226; se ejecutaron además seis detectores de la demo temporal de WISE. Se eliminaron dos duplicados SHA-256 idénticos y un archivo parcial cotejado con el cubo completo. El servidor experimental se expone en red, restringe rutas estáticas y rechaza HEAD; no incorpora aún una caché general ni garantías de concurrencia, recuperación o controles de producción.


## Renderizador propio experimental

El prototipo local `~/Desktop/skyshift-demo/visor-propio.py` calcula una proyección ortográfica de la esfera de direcciones y convierte RA/Dec a HEALPix anidado; no usa Aladin ni iframe. Utiliza la atlas PNG HiPS de orden 3 para la panorámica y carga teselas de orden 4 al acercar. Los PNG son para visualización; no sustituyen los FITS completos. El navegador gira al arrastrar y controla el campo con la rueda. Es una visualización de direcciones, no de distancias físicas.

Comprobación de orientación: el WCS del cubo FITS 445 relaciona los desplazamientos HEALPix (dx, dy) con x=dy y fila PNG=dx. Las imágenes se obtienen de IRSA y se guardan en `raw-hips/`; archivos descargados se validan antes de escribirse atómicamente. Limitaciones: falta acceso en resolución máxima orden 5, vista interactiva sin latencia de servidor, política de cuota de caché, controles robustos y serie temporal. El prototipo no se considera módulo de producto ni establece equivalencia científica global.

Los planos vacíos son índices 50 y 51 desde cero, es decir 51 y 52 si se muestra numeración desde uno: se comprobó con el cubo FITS local. La formulación previa de la interfaz que decía 50–51 en numeración visible era incorrecta.
