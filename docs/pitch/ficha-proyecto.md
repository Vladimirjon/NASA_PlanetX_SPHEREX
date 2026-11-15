# Ficha del proyecto / Project card (ES + EN)

> Copiar y pegar en la plataforma. Completar `[URL VIDEO]` (la demo ya está publicada) antes de las 09:00. / Copy and paste into the platform; fill in `[URL VIDEO]` (the demo is already live) before 09:00.

## Español

**Nombre:** Copernix
**Equipo:** NA ZA · NASA Space Apps Challenge 2026 · Sede Sangolquí
**Reto:** Planet X and SPHEREx

**En una línea:** Elige cualquier punto del cielo, mira cómo cambian con el tiempo las imágenes infrarrojas reales del telescopio SPHEREx de la NASA y entiende qué cambió, aunque no sepas astronomía.

**Qué hace:** Copernix muestra un mapa del cielo con las fotos reales de SPHEREx de la zona elegida y las pasa como un video corto («fotos en secuencia»), las resta («solo lo que cambió») o las pinta por fecha («fechas en color»). Cada foto lleva su procedencia (archivo, fecha, color de luz infrarroja y colección). Un semáforo **Observado / Evaluado / Confirmado** deja claro hasta dónde llega la evidencia; el software nunca marca «Confirmado». Para Epsilon Indi B incluye una medición real de movimiento: 6,6″ hacia el sureste en 1,4 años, **aún sin verificación independiente**.

**Datos de la NASA y aliados:**
- SPHEREx (NASA/IPAC, vía IRSA): https://irsa.ipac.caltech.edu/Missions/spherex.html · DOI https://doi.org/10.26131/IRSA652 · tutoriales https://caltech-ipac.github.io/irsa-tutorials/spherex/
- Gaia DR3 (ESA, vía STScI/IRSA): https://archive.stsci.edu/missions-and-data/gaia
- Modelo 3D del telescopio: NASA's Eyes (NASA/JPL-Caltech): https://eyes.nasa.gov/apps/solar-system/
- Reto oficial: https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=details

**Cómo está hecho:** motor de cielo propio en WebGL2 sobre HiPS/HEALPix, API FastAPI con contrato OpenAPI y caché local-first, visor en React, búsqueda de objetos y modo sin conexión con datos grabados. Código abierto con licencia MIT.

**Uso de IA (declaración):** Claude (Anthropic) y agentes de Cursor ayudaron a escribir código y textos; las ilustraciones conceptuales de los cinco objetos y el campo de estrellas del esquema del método se generaron con ChatGPT Images y llevan marca de agua visible; no son datos de la NASA. El logotipo y el icono de Copernix también se generaron con IA (ChatGPT Images). Detalle y revisión humana: https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/blob/main/docs/AI_USAGE.md
**Logos:** no se usa ningún logo de la NASA. Copernix no es un producto oficial de la NASA.

**Enlaces:** Demo en vivo: https://demo.copernix.workers.dev · Repositorio (MIT): https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX · Video: [URL VIDEO]

## English

**Name:** Copernix
**Team:** NA ZA · NASA Space Apps Challenge 2026 · Sangolquí
**Challenge:** Planet X and SPHEREx

**In one line:** Pick any spot in the sky, watch real infrared images from NASA's SPHEREx telescope change over time, and understand what changed, even with no astronomy background.

**What it does:** Copernix shows a sky map with the real SPHEREx photos of the chosen region and plays them as a short video ("photos in sequence"), subtracts them ("only what changed") or paints them by date ("dates in colour"). Every photo carries its provenance (file, date, infrared colour of light and collection). A **Observed / Evaluated / Confirmed** traffic light shows how far the evidence goes; the software never assigns "Confirmed". For Epsilon Indi B it includes a real motion measurement: 6.6″ toward the southeast over 1.4 years, **not independently verified yet**.

**NASA and partner data:**
- SPHEREx (NASA/IPAC, via IRSA): https://irsa.ipac.caltech.edu/Missions/spherex.html · DOI https://doi.org/10.26131/IRSA652 · tutorials https://caltech-ipac.github.io/irsa-tutorials/spherex/
- Gaia DR3 (ESA, via STScI/IRSA): https://archive.stsci.edu/missions-and-data/gaia
- 3D telescope model: NASA's Eyes (NASA/JPL-Caltech): https://eyes.nasa.gov/apps/solar-system/
- Official challenge: https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=details

**How it is built:** a custom WebGL2 sky engine over HiPS/HEALPix, a FastAPI backend with an OpenAPI contract and a local-first cache, a React viewer, object search and an offline mode with recorded data. Open source under the MIT license.

**AI use (declaration):** Claude (Anthropic) and Cursor agents helped write code and copy; the concept illustrations of the five objects and the star field in the method diagram were generated with ChatGPT Images and carry a visible watermark; they are not NASA data. The Copernix wordmark and icon were also generated with AI (ChatGPT Images). Details and human review: https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/blob/main/docs/AI_USAGE.md
**Logos:** no NASA logos are used. Copernix is not an official NASA product.

**Links:** Live demo: https://demo.copernix.workers.dev · Repository (MIT): https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX · Video: [URL VIDEO]
