# Plan técnico y de equipo — Planet X and SPHEREx

Preparado el viernes 13 de noviembre de 2026 para el hackathon del sábado 14 y el domingo 15. Complementa [problema.md](problema.md), [resources.md](resources.md) y [reglas_evento.md](reglas_evento.md).

**Regla del evento que condiciona este plan:** el código, el prototipo y el análisis específico se hacen a partir del **sábado a las 09:00**. Hoy solo se preparan cuentas y entornos, se estudian los datos y se reparten roles ([reglas_evento.md](reglas_evento.md)). Las consultas de abajo son una exploración de datos; ninguna línea de este documento es código del producto.

Cada dato indica su origen: **[medido]** significa que se comprobó hoy con consultas reales a IRSA; **[doc]**, que procede de la documentación oficial citada; **[inferencia]**, que es un razonamiento del equipo que hay que confirmar.

---

## 1. Qué comprobamos hoy sobre los datos

### Los cinco objetos tienen datos reales de SPHEREx [medido]

Se consultó la tabla `spherex.obscore` del [TAP de IRSA](https://irsa.ipac.caltech.edu/TAP) con las coordenadas J2000. Las colecciones disponibles son `spherex_dr1`, `spherex_qr3`, `spherex_dr1_deep` y `spherex_qr3_deep`. La colección `spherex_qr` ya no devuelve resultados.

| Objeto              | Imágenes                   | Ventanas de observación (n.º de imágenes)                                                            |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| WISE 0855           | 258                         | may 2025 (30) · nov 2025 (110) · dic 2025 (18) · abr–may 2026 (100)                                 |
| Estrella de Barnard | 363                         | ago–sep 2025 (110) · sep–oct 2025 (10) · mar–abr 2026 (112) · may 2026 (8) · ago–sep 2026 (123) |
| Epsilon Indi B      | 460                         | abr–jun 2025 (127) · sep–nov 2025 (142) · abr–may 2026 (75) · sep–oct 2026 (116)                 |
| RW Aurigae          | 335                         | sep 2025 (112) · feb–mar 2026 (114) · sep 2026 (109)                                                 |
| R Draconis          | 664 (171 de campo profundo) | may–jul 2025 (165) · oct 2025–ene 2026 (180) · abr 2026 (12) · may–jul 2026 (136)                 |

Conclusión: cada objeto tiene entre **3 y 5 épocas** en unos 12 a 17 meses. Esa es la "serie temporal" del reto. En cada época hay decenas de imágenes porque el telescopio observa el mismo punto con longitudes de onda distintas (siguiente apartado).

### Cómo son las imágenes [medido + doc]

- Cada imagen corresponde a un detector, del **D1 al D6**, que cubren de **0,75 a 5,0 µm** ([tutorial de introducción](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/)).
- **Filtro lineal variable (LVF).** Dentro de una misma imagen, la longitud de onda cambia de un extremo a otro del detector. Dos imágenes del mismo objeto pueden mostrarlo con brillos distintos solo porque lo captaron en longitudes de onda diferentes, sin que se haya movido [doc]. **Esta es la trampa principal del reto:** un "parpadeo" ingenuo entre imágenes mezcla movimiento con color.
- **Escala:** 6,2″ por píxel [doc, coincide con lo medido: 0,1° ≈ 58 píxeles]. FWHM del PSF ≈ 5″ [doc].
- **Archivo completo:** FITS de unos **66 MB** con las extensiones `IMAGE`, `FLAGS`, `VARIANCE`, `ZODI`, `EPSF` y `WCS-WAVE` [medido].
- **Recorte:** `access_url_del_fits?center=RA,DEC&size=GRADOS` devuelve un FITS [medido]; no ofrece PNG ni JPEG [doc]. **Cada recorte pesa unos 4 MB y tarda de 8 a 10 s aunque se pida pequeño**, porque incluye la tabla del PSF [medido]. La imagen útil ocupa solo unos 15 KB.
- **Lectura por rangos:** el servidor IBE acepta peticiones HTTP con `Range` (responde 206) [medido]. Además, los archivos están en un bucket público de AWS, `nasa-irsa-spherex` [medido en el datalink]. Con astropy y fsspec podría leerse solo la sección necesaria [inferencia: probar el sábado].
- **CORS:** IRSA no envía la cabecera `Access-Control-Allow-Origin` [medido]. **El navegador no puede consultar IRSA directamente: hace falta un backend propio.**
- **HiPS de SPHEREx para Aladin:** existe `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube` (cubo de DR1) [medido]. Sirve para el contexto visual, no para la serie temporal, porque es un mosaico combinado.

### Cuánto se mueven los objetos [doc: SIMBAD/Gaia, vía Antigravity; cálculo comprobado]

| Objeto         | Movimiento propio | En 6 meses | En 12 meses | Qué debe mostrar la herramienta               |
| -------------- | ----------------- | ---------- | ----------- | ---------------------------------------------- |
| Barnard        | 10,4″/año       | 0,84 px    | 1,7 px      | Movimiento                                     |
| WISE 0855      | 8,2″/año        | 0,66 px    | 1,3 px      | Movimiento                                     |
| Epsilon Indi B | 4,7″/año        | 0,38 px    | 0,76 px     | Movimiento leve                                |
| RW Aurigae     | 0,03″/año       | ~0         | ~0          | **Cambio de brillo** (estrella variable) |
| R Draconis     | 0,03″/año       | ~0         | ~0          | **Cambio de brillo** (variable Mira)     |

**Consecuencias de diseño [inferencia razonada]:**

1. **El movimiento es de 1 o 2 píxeles en toda la serie.** No se notará a simple vista en un GIF pequeño. Hay que ampliar con vecino más cercano (sin suavizar), alinear todas las épocas en una misma rejilla y ofrecer una imagen de diferencia (última época menos primera) y una cruz con la posición prevista en cada fecha.
2. **Las coordenadas de catálogo hay que proyectarlas a la fecha de la observación.** Desde J2000, Barnard se ha desplazado unos **4,3′** (≈ 42 px) y WISE 0855 se ha movido unos 1,6′ desde la época de las coordenadas del enunciado. Un recorte pequeño centrado en la posición de catálogo puede no contener la estrella.
   - **RA/Dec directos siguen siendo la entrada principal** del reto: se recorta esa zona tal cual, sin consultar catálogos.
   - Solo cuando se busca por nombre se toman la posición, el movimiento propio y el paralaje de SIMBAD o Gaia DR3. La posición se propaga con `SkyCoord.apply_space_motion` de astropy. El paralaje (~0,5″, menos de 0,1 px) casi no se nota, pero así queda bien hecho.
3. **Comparar siempre la misma longitud de onda.** En cada época se eligen las imágenes cuya longitud de onda en el objeto queda cerca de la elegida (tabla `WCS-WAVE`) y se combinan. WISE 0855 es una enana marrón Y muy fría: casi invisible por debajo de 3 µm y brillante cerca de 4,5 µm. Para ella conviene usar **D5 o D6** [inferencia astrofísica; verificar con las imágenes].
4. Barnard es muy brillante en el infrarrojo cercano y podría saturar algunos detectores: revisar `FLAGS` [inferencia].

---

## 2. Qué construimos

**Producto:** una web pública que recibe una coordenada o un nombre (por ejemplo "Barnard's Star"), busca en IRSA todas las épocas de SPHEREx, alinea los recortes en una rejilla común a una longitud de onda elegida y los reproduce como parpadeo. También muestra la diferencia entre épocas, la trayectoria prevista y los metadatos de cada fotograma.

**Público objetivo: público general** (ficha del reto). La pantalla inicial ofrece botones de un clic para los cinco objetos y una explicación breve en lenguaje sencillo de qué se está viendo y por qué se mueve. Los controles técnicos (detector, longitud de onda, campo, metadatos) quedan en un panel "Avanzado".

### Mínimo entregable (lo que cumple el objetivo oficial)

1. Campo de entrada RA/Dec (la vía principal) y, como ayuda, búsqueda por nombre con SIMBAD o Sesame.
2. Lista de épocas disponibles en IRSA para esa posición.
3. Un fotograma por época, alineado y a una longitud de onda comparable.
4. Reproductor con play, pausa, velocidad, deslizador de fotograma y ampliación sin suavizado.
5. Funciona con los cinco objetos del reto y una galería de esos cinco precalculada como respaldo.
6. Coordenadas en la URL: `?ra=…&dec=…` o `?name=…`. Es una consideración opcional del reto, pero cuesta poco.

### Diferenciadores, en orden de prioridad (solo cuando el mínimo funcione)

1. Imagen de diferencia o resta entre épocas (consideración opcional del reto).
2. Cruz con la posición prevista por el movimiento propio de Gaia DR3 y superposición de fuentes de Gaia (opcional del reto).
3. **Mini perfil espectral D1–D6** del objeto: flujo por detector. Responde a la pregunta "¿por qué SPHEREx?". Por ejemplo, WISE 0855 desaparece en D1–D3 y aparece en D5–D6. Se usan los mismos recortes, así que no exige descargas extra.
4. Selector de detector o longitud de onda y de tamaño del campo (opcional del reto).
5. Panel de metadatos: fecha, longitud de onda, colección, identificador y porcentaje de píxeles marcados en `FLAGS` (opcional del reto: "indicadores de contaminación").
6. Curva de brillo simple para las variables, como RW Aur y R Dra: flujo en el centro por época.
7. Contexto con Aladin Lite: HiPS de SPHEREx, 2MASS o WISE. Es **solo un visor secundario**, sin sincronización compleja con el reproductor.
8. Actualización automática: una GitHub Action semanal vuelve a consultar IRSA y regenera la galería, para incorporar las entregas semanales de QR3 (opcional del reto).

**Fuera de alcance:** detección automática con IA, espectros completos de 102 bandas y cuentas de usuario.

---

## 3. Arquitectura y stack

```
Navegador (GitHub Pages)                     Backend (FastAPI, Docker)                 IRSA
React + Vite + TypeScript   ── /api ──▶      1. SIMBAD/Sesame: nombre → RA/Dec + PM
Aladin Lite v3 (contexto)                    2. TAP spherex.obscore → épocas         ──▶ TAP
Reproductor WebGL2          ◀── JSON ─────  3. recortes en paralelo (máx. 6-8)      ──▶ IBE cutouts
                                             4. reproyección a rejilla común (reproject)
                                             5. selección por λ y combinación por época
                                             6. float32 + metadatos en JSON        
                                             7. caché en disco por (ra, dec, size, λ)
```

| Capa                           | Elección                                                                                                                                                                                                            | Por qué                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend: API                   | Python 3.12, FastAPI, Pydantic v2, uvicorn, orjson                                                                                                                                                                   | El esquema OpenAPI sale automático y de él se generan los tipos del frontend                                                                                                                                                     |
| Backend: astronomía           | astropy (`fits`, `WCS`, `SkyCoord.apply_space_motion`), reproject (`reproject_interp`), numpy, astroquery (SIMBAD)                                                                                           | Astropy es el estándar que cita el reto; reproject alinea épocas con WCS distintos                                                                                                                                               |
| Backend: red y caché          | httpx asíncrono con semáforo (máx. 6-8 descargas), diskcache                                                                                                                                                      | Descargas paralelas sin saturar IRSA; repetir una consulta es instantáneo                                                                                                                                                         |
| Backend: calidad               | pytest, ruff, mypy; `uv` para dependencias fijadas                                                                                                                                                                 | CI rápido                                                                                                                                                                                                                         |
| Formato de fotograma           | **Matriz float32 cruda + JSON de metadatos**, no PNG                                                                                                                                                           | Así el contraste, la paleta de colores, la resta y la mezcla de detectores se calculan en el navegador sin volver a pedir datos                                                                                                   |
| Frontend: base                 | React 19 + TypeScript estricto + Vite                                                                                                                                                                                | Lo pidió el equipo; el resto de la tabla lo concreta                                                                                                                                                                              |
| Frontend: estado               | **TanStack Router** (RA, Dec, detector, modo y fotograma viven en la URL, con tipos), **TanStack Query** (pedidos, caché y fotogramas que llegan uno a uno), **Zustand** (estado del reproductor) | Cumple "coordenadas en la URL" y hace compartible cualquier vista                                                                                                                                                                  |
| Frontend: imagen               | **WebGL2 propio** (texturas R32F + paleta en textura; estiramiento asinh/zscale, resta y compuesto D1–D6 en shaders) + decodificación en un **Web Worker**                                             | Es la parte técnicamente fuerte: 60 fps al hacer blink y cambiar el contraste sin volver al servidor                                                                                                                              |
| Frontend: gráficos y contexto | Observable Plot (perfil D1–D6, curva de luz), Aladin Lite v3 por CDN (vista secundaria)                                                                                                                             | Plot es declarativo y rápido de aprender; Aladin está citado en el reto                                                                                                                                                          |
| Frontend: interfaz             | Radix UI (controles accesibles), Tailwind CSS v4 con los tokens de DESIGN.md, Motion (con `prefers-reduced-motion`)                                                                                                | Accesibilidad AA sin reinventar controles                                                                                                                                                                                          |
| Frontend: calidad              | Vitest + Testing Library; Playwright (prueba de humo con los 5 objetos); ESLint; `openapi-typescript`                                                                                                              | Si el contrato de la API cambia, el build falla                                                                                                                                                                                    |
| Errores en producción         | Sentry (gratis con el Student Pack) en frontend y backend                                                                                                                                                            | Ver fallos durante la demo                                                                                                                                                                                                         |
| Hosting frontend               | GitHub Pages con despliegue desde Actions                                                                                                                                                                            | Gratis e integrado con el repo                                                                                                                                                                                                     |
| Hosting backend                | **Hugging Face Spaces (Docker, CPU gratuita)**; Azure for Students como alternativa                                                                                                                            | Spaces es gratis, no pide tarjeta ni depende de que se apruebe el Student Pack [inferencia sobre las condiciones de HF: confirmarlas al crear la cuenta]. Duerme tras inactividad, así que hay que despertarlo antes de presentar |
| Respaldo para la demo          | Galería precalculada de los cinco objetos (JSON con float32) servida desde Pages                                                                                                                                          | Si fallan IRSA, el backend o la red del coliseo, la demo sigue funcionando                                                                                                                                                         |
| Versiones                      | Fijarlas el sábado al instalar: `uv lock` en el backend y `package-lock.json` en el frontend; Aladin Lite con versión exacta en la URL del CDN                                                                 | Regla del equipo: sin dependencias flotantes                                                                                                                                                                                       |

**Riesgo técnico principal: el tiempo de respuesta.** Una época tiene decenas de imágenes, y cada recorte tarda de 8 a 10 s. Mitigaciones en orden:

1. Elegir pocas imágenes por época, de 2 a 4 con la longitud de onda más cercana a la buscada.
2. Hacer las descargas en paralelo, con un límite respetuoso con IRSA.
3. Mostrar cada fotograma en cuanto llegue: el frontend pide **un fotograma por petición**, de modo que ninguna petición individual tarde más de unos 60 s. El proxy de un hosting gratuito puede cortar las peticiones largas [inferencia].
4. Usar una caché en disco.
5. Si da tiempo, leer solo la sección necesaria con rangos HTTP o desde S3 (fsspec), en lugar del recorte de 4 MB.

**Contrato de la API:** el vigente está en [ROLES.md, sección 3](ROLES.md#3-contratos-entre-roles). Sustituye al borrador del 13 de noviembre (`/api/frames` con PNG).

---

## 4. Cómo aprovechar GitHub y el Student Pack

Todo lo siguiente es **gratis**. Los datos del pack vienen de la [página oficial](https://education.github.com/pack), resumida por el agente explorador; conviene confirmar cada oferta al activarla.

| Herramienta                                       | Uso concreto en el hackathon                                                                                                                                                                                                                   | Costo                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Organización de GitHub + repo público** | Repo con licencia MIT; la entrega pide enlaces abiertos                                                                                                                                                                                        | Gratis                                                                                                   |
| **GitHub Projects (tablero)**               | Columnas Por hacer / En curso / En revisión / Hecho; un issue por tarea con responsable                                                                                                                                                       | Gratis                                                                                                   |
| **Issues + plantilla de PR**                | Cada tarea en un issue; ramas `feat/NN-descripcion`; Conventional Commits                                                                                                                                                                    | Gratis                                                                                                   |
| **Protección de `main`**                 | Exigir PR y CI en verde, sin push directo. La aprobación humana **no bloquea**: el autor integra su propio PR cuando el CI pasa. Se exige revisión de otra persona solo en los hitos del sábado a las 18:00 y del domingo a las 02:00 | Gratis en repo público                                                                                  |
| **GitHub Actions**                          | CI (ruff + pytest en el backend; lint + build en el frontend), despliegue de Pages y regeneración semanal de la galería                                                                                                                      | Gratis en repo público                                                                                  |
| **GitHub Pages**                            | Frontend y galería de respaldo                                                                                                                                                                                                                | Gratis                                                                                                   |
| **Codespaces** con `.devcontainer`        | El mismo entorno Python y Node para las cinco personas; evita problemas de astropy en Windows                                                                                                                                                  | Incluido en el pack (nivel Pro según la página)                                                        |
| **Copilot Student**                         | Asistente de código para cada integrante; declarar el uso de IA en la entrega, como piden las bases                                                                                                                                           | Gratis para estudiantes verificados                                                                      |
| **Releases**                                | Etiqueta `v1.0` con lo entregado el domingo a las 10:30: deja claro qué se evaluó                                                                                                                                                          | Gratis                                                                                                   |
| Azure for Students                                | Alternativa de hosting: USD 100 en créditos sin tarjeta                                                                                                                                                                                       | Crédito; al agotarse, el servicio se detiene en lugar de cobrar [según la página del pack; confirmar] |
| Dominio .tech, .me o Name.com                     | Solo si sobra tiempo; la propagación de DNS es un riesgo                                                                                                                                                                                      | Gratis el primer año; la renovación sí se cobra                                                       |
| Sentry                                            | Opcional, para errores del backend                                                                                                                                                                                                             | Gratis en el pack                                                                                        |

**Estado:** los cinco integrantes ya tienen GitHub Education. El backend irá en Hugging Face Spaces, decisión del equipo del 13 de noviembre.

---

## 5 y 6. División del trabajo y cronograma

Sustituidos por [ROLES.md](ROLES.md): cinco roles sin asignar, pasos exactos por rol, contratos y horario.

---

## 7. Pendiente y riesgos

- **Por verificar el sábado:** tiempo real de la cadena completa por consulta, saturación de Barnard, visibilidad de WISE 0855 en D5 y D6, lectura parcial con fsspec y condiciones de Hugging Face Spaces.
- **Por confirmar con la organización:** formato de entrega local y global (ver [reglas_evento.md](reglas_evento.md)).
- **Reconocimiento obligatorio:** incluir en el README y en la web los textos de SPHEREx e IRSA, junto con el DOI de la colección usada. Están en [la página de la misión](https://irsa.ipac.caltech.edu/Missions/spherex.html) y en el [resumen de versiones](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html).
- **Carga a IRSA:** limitar la concurrencia y usar caché. Es un servicio público compartido.
