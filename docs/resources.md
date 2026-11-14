# Recursos del reto Planet X and SPHEREx

**Fuente de la lista:** [NASA Space Apps 2026 — pestaña Resources](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=resources), consultada el 13 de noviembre de 2026. La página advierte que pueden añadirse recursos y que los sitios no gubernamentales tienen sus propias condiciones de uso. Las descripciones siguientes resumen su finalidad; los enlaces adicionales están identificados como tales.

**Prioridad para estudiar el reto:** empezar por el archivo de SPHEREx y sus tutoriales; WiseView sirve de referencia para observar cómo se presentan imágenes de otra misión. Gaia y los recursos canadienses son complementarios. Esta prioridad organiza la lectura: no es una obligación adicional del reto.

## Recursos publicados por NASA Space Apps

### 1. Datos de la misión SPHEREx

**[NASA/IPAC Infrared Science Archive — SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html)**

- **Qué es:** página del archivo IRSA dedicada a datos, documentación y herramientas de la misión SPHEREx.
- **Para qué sirve:** localizar productos de datos reales, consultar documentación, explorar imágenes y encontrar servicios de descarga o recorte.
- **Acceso observado:** la página es pública. Ver imágenes de esta página no equivale a haber comprobado que haya observaciones suficientes de cada objeto pedido ni que un servicio concreto funcione para el equipo.
- **Versiones:** IRSA indica que publicó **DR1 en noviembre de 2026** y que **DR1 y QR3** forman juntos un conjunto de imágenes procesado de forma uniforme. QR2 ya no aparece en las búsquedas de IRSA/VO; QR1 fue retirado. Los tutoriales recomiendan DR1 y QR3 frente a QR2. [Versiones de IRSA](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html); [tutoriales SPHEREx](https://caltech-ipac.github.io/irsa-tutorials/spherex/).
- **Reconocimiento:** IRSA solicita citar el producto utilizado y proporciona un texto de reconocimiento en la página de la misión. Revisar la referencia de la versión concreta usada.

Enlaces dentro de IRSA, útiles para orientarse:

| Herramienta o documentación | Uso descrito por IRSA |
| --- | --- |
| [SPHEREx Data Explorer](https://irsa.ipac.caltech.edu/applications/spherex/) | Explorador de los datos de la misión. La página abre una aplicación; no se probó una búsqueda interactiva. |
| [Introducción a las imágenes espectrales](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/) | Buscar imágenes que cubren una posición y conocer la estructura de archivos FITS. |
| [Tutorial de recortes](https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/) | Obtener y utilizar recortes de imágenes espectrales. |
| [Documentación de Cutout Tool](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html) | Información del servicio que extrae partes espaciales de imágenes FITS. |
| [Interfaces de programación de IRSA](https://irsa.ipac.caltech.edu/voapi.html) | Documentación de servicios de acceso programático. |

### 2. Tutoriales de SPHEREx

**[SPHEREx Tutorial Notebooks](https://caltech-ipac.github.io/irsa-tutorials/spherex/)**

- **Qué son:** ejemplos de notebooks para consultar y trabajar con datos de SPHEREx mediante Python.
- **Contenido:** introducción a imágenes espectrales, recortes, modelos de respuesta puntual, descubrimiento de fuentes y cubos de datos.
- **Acceso observado:** la página y su contenido son públicos. No se ejecutaron los notebooks ni se verificaron las dependencias en el equipo.
- **Relación con el reto:** ayudan a entender los productos y las formas de consultarlos; no constituyen una implementación elegida por Na za.

### 3. Ejemplo de visualización de otra misión

**[WiseView](https://byw.tools/wiseview)**

- **Qué es:** la pestaña del reto lo describe como una herramienta semejante para visualizar imágenes de **WISE**, una misión anterior de NASA, y lo ofrece como inspiración.
- **Para qué sirve:** observar un ejemplo de comparación de imágenes a lo largo del tiempo. Sus imágenes corresponden a WISE, no deben presentarse como observaciones de SPHEREx.
- **Acceso observado:** el enlace devolvió un error 502 durante la consulta automática; esto no demuestra que esté caído para todas las personas o redes. La [descripción de los creadores](https://blog.backyardworlds.org/2017/09/13/wiseview/) explica su propósito, aunque es una publicación de 2017 y no confirma su estado actual.

### 4. Datos complementarios de Gaia

**[Gaia Mission Data — MAST](https://archive.stsci.edu/missions-and-data/gaia)**

- **Qué es:** información y acceso a datos de la misión Gaia, que midió posiciones, distancias y movimientos de estrellas, entre otras propiedades.
- **Relación con el reto:** el enunciado propone, como posibilidad opcional, superponer datos de otros telescopios. La pestaña Resources indica utilizar **Gaia Data Release 3**.
- **Acceso observado:** la página informativa abrió públicamente; no se ejecutaron consultas ni se verificaron requisitos de acceso por producto.

## Recursos de la Agencia Espacial Canadiense

Los cuatro enlaces siguientes aparecen en la pestaña oficial como recursos de una agencia asociada. Se refieren a **NEOSSat** y otras observaciones astronómicas; no son imágenes de SPHEREx ni sustituyen el objetivo principal del reto.

### 5. Misión NEOSSat

**[NEOSSat: Observing Asteroids, Space Debris and Exoplanets](https://www.asc-csa.gc.ca/eng/satellites/neossat/)**

- Página de la Agencia Espacial Canadiense sobre el telescopio NEOSSat, su seguimiento de asteroides y cometas, basura espacial y estudios de exoplanetas.
- **Acceso observado:** página pública. Sirve como contexto científico y de misión.

### 6. Archivo astronómico canadiense

**[Canadian Astronomy Data Centre (CADC)](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/)**

- Archivo de observaciones de múltiples misiones y telescopios, entre ellos NEOSSat.
- **Acceso observado:** página pública; CADC señala que sus colecciones son abiertas y están orientadas a la investigación astronómica profesional. No se verificó el acceso individual a cada colección.

### 7. Tutorial de datos NEOSSat

**[NEOSSat Data Tutorial](https://github.com/asc-csa/NEOSSAT_Tutorial)**

- Repositorio de la Agencia Espacial Canadiense con un tutorial para descargar, filtrar y visualizar datos NEOSSat, incluidos archivos FITS.
- **Acceso observado:** repositorio público y legible. No se ejecutó el código; si se reutiliza, revisar su licencia y citarlo.

### 8. Conjunto de datos NEOSSat

**[NEOSSat Dataset](https://data.asc-csa.gc.ca/dataset/neossat)**

- La pestaña del reto lo identifica como conjunto de observaciones de NEOSSat.
- **Acceso observado:** el enlace agotó el tiempo de espera durante la consulta; no se verificaron sus archivos, formato ni condiciones de acceso. Como alternativa para investigar el archivo, consultar [CADC](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/) y el [tutorial de NEOSSat](https://github.com/asc-csa/NEOSSAT_Tutorial).

## Estado y precauciones

- **Datos reales:** IRSA publica datos de SPHEREx; la documentación consultada distingue versiones reales DR1 y QR3. Su disponibilidad general no verifica la cobertura temporal o la visibilidad de cada objeto concreto.
- **Pruebas pendientes:** no se han descargado imágenes para los cinco objetos ni se han ejecutado los notebooks o servicios. No se ha validado todavía una secuencia para la herramienta.
- **Acceso y costos:** las páginas informativas consultadas son públicas; no se ha contratado ni configurado ningún servicio. Si se considera usar infraestructura en la nube, revisar antes condiciones, cuotas y posibles cobros del proveedor. El acceso público a un archivo no garantiza que todos los servicios externos sean gratuitos.
- **Atribución:** registrar la versión, procedencia y condiciones de cada dato, herramienta o imagen utilizada. El reto recuerda respetar las condiciones de los sitios externos.
