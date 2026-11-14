# 01 · El reto, el jurado y los entregables

Fuentes verificadas el 14-nov-2026: página oficial del reto ([details](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=details), [resources](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=resources)), [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/), [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) y **la rúbrica oficial de Sangolquí** (`docs/fuentes/guia-participantes-y-rubrica-sangolqui-2026.pdf`).

## 1. Plazos que mandan (hora de Ecuador, UTC−5)

| Cuándo | Qué | Fuente |
| --- | --- | --- |
| **Dom 15 · 09:00** | **Entrega local obligatoria** en el formulario de la sede + carga en la plataforma global | Rúbrica Sangolquí §3 |
| Dom 09:30–10:45 | El staff audita enlaces, licencia, idioma, IA (penalizaciones) | Rúbrica §2 |
| Dom 11:00–13:30 | **Pitch en vivo en español + Q&A** ante 4 jueces | Rúbrica §6 |
| Dom 15 · 23:59 | Cierre global (se puede reenviar hasta entonces; cuenta la última versión) | Submission Guide |

Consecuencia: **todo lo que se entrega debe estar listo y público antes de las 09:00 del domingo**, no a las 11:00. La duración del pitch no aparece en la rúbrica: **confirmar con la organización** (bases anteriores decían 5 min + 3 min de preguntas).

## 2. Qué pide el reto (resumen fiel)

**Objetivo:** una herramienta web pública que muestre imágenes del cielo de SPHEREx y haga fácil ver cómo cambian con el tiempo. La persona escribe **RA/Dec**; la herramienta muestra una serie de imágenes de esa zona "como un pequeño video" para detectar objetos que se mueven.

**Objetos de prueba obligatorios:** Estrella de Barnard, Epsilon Indi B (par de enanas marrones), WISE 0855 (RA 08h55m10.831s, Dec −7°14′42.53″), RW Aurigae y R Draconis (estas dos son **variables**: cambian de brillo, no de posición).

**Ideas opcionales que NASA sugiere** (ninguna es obligatoria):
- Actualizarse fácil cuando salgan datos nuevos.
- Mostrar las 102 bandas de forma creativa; sumar datos por detector (6) para mejorar señal/ruido. **"Extra kudos" por generar espectros al vuelo.**
- Sumar o restar imágenes de distintas fechas.
- Elegir el campo de visión.
- Superponer datos de Gaia o WISE.
- Coordenadas en la URL (para enlazar desde otros sitios).
- Mostrar metadatos como banderas de contaminación.
- Usar herramientas existentes: Astropy, Aladin.

**Recursos oficiales:** [IRSA SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html), [tutoriales SPHEREx](https://caltech-ipac.github.io/irsa-tutorials/spherex/), [WiseView](http://byw.tools/wiseview) (inspiración, datos WISE), [Gaia DR3 en MAST](https://archive.stsci.edu/missions-and-data/gaia), y de la Agencia Espacial Canadiense: [NEOSSat](https://www.asc-csa.gc.ca/eng/satellites/neossat/), [CADC](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/), [tutorial NEOSSat](https://github.com/asc-csa/NEOSSAT_Tutorial), [dataset NEOSSat](https://data.asc-csa.gc.ca/dataset/neossat).

## 3. ¿Es "más pitch que técnica"? Respuesta honesta: **no**

La rúbrica local tiene **4 áreas con el mismo peso base**, 5 preguntas cada una, escala 1–5 (el 5 se reserva para lo excepcional):

| Área | Qué miden de verdad |
| --- | --- |
| **RCD** Rigor científico y datos | Datos NASA usados como núcleo (no decoración), ciencia correcta, **explicar el procesamiento**, dominio en Q&A, transparencia de fuentes e IA |
| **IET** Innovación y ejecución técnica | **Demo funcionando en vivo**, arquitectura coherente, originalidad, defensa técnica en Q&A, factibilidad |
| **IR** Impacto y relevancia | Responder **todo** el reto, impacto, plan post-hackathon, pertinencia, **accesibilidad y usabilidad para cualquier ciudadano** |
| **STP** Storytelling y presentación | Narrativa Problema → Solución con datos → Impacto, **calidad visual de la UI**, tiempo, oratoria, sinergia en Q&A |

Luego cada categoría de premio pondera las áreas distinto. Las que mejor encajan con este reto:

| Categoría | RCD | IET | IR | STP |
| --- | --- | --- | --- | --- |
| **Best Use of Data** ("hace accesibles los datos espaciales") | 50% | 20% | 15% | 15% |
| Best Use of Science | 50% | 20% | 20% | 10% |
| Galactic Impact | 15% | 15% | 50% | 20% |
| Best Storytelling | 15% | 15% | 20% | 50% |

Además, cada juez que nomina al equipo en una categoría suma **+3 puntos** directos en esa categoría.

**Conclusión para el equipo:**
- El pitch pesa, pero **la ciencia correcta y una demo real pesan igual o más**. Para "Best Use of Data", el rigor científico vale el 50%.
- La UX **sí puntúa directamente** en 3 lugares: 3.5 (accesible para cualquier ciudadano), 4.2 (calidad visual de la UI) y 2.1 (demo fluida). Una gran UX es nuestra ventaja si va **encima** de datos reales bien explicados.
- El Q&A puntúa en 3 áreas (1.4, 2.4, 4.5): **las 5 personas deben poder explicar la ciencia básica y el pipeline**. Por eso existe `02-ciencia-para-cs.md`.
- Nivel global: los jueces casi no ven el pitch. Ven la **página del proyecto**, un video de ≤30 s o ≤7 slides, y un enlace público.

## 4. Penalizaciones del staff (evitables, se restan de todas las categorías)

| Falla | Puntos |
| --- | --- |
| No citar/enlazar datos NASA | −2 |
| Sin repo público o sin `LICENSE` abierta en la raíz | −2 |
| Algún enlace privado, pide login o da 404 (probar en incógnito) | −1 |
| 8+ diapositivas o video > 35 s | −1 |
| Sin declaración de IA, sin marca de agua en imágenes IA o logos NASA usados con IA | −1 |
| Ficha/entregables solo en un idioma (debe ser ES **y** EN) | −1 |

## 5. Lista de entregables (checklist para el domingo 09:00)

- [ ] Repo público en GitHub con `LICENSE` (MIT, ya creada) y README bilingüe.
- [ ] Demo desplegada y pública, probada en incógnito; con respaldo offline para los 5 objetos.
- [ ] Slides **≤ 7** (PDF), bilingües o en dos versiones. Estructura sugerida: portada · problema · solución · datos NASA y método · arquitectura y demo · impacto y hoja de ruta · transparencia, IA, créditos y roles.
- [ ] Video opcional **≤ 30 s** (tolerancia 35 s), subtítulos en inglés si se habla español.
- [ ] Ficha del proyecto en la plataforma global, ES + EN: resumen, enlaces, datos NASA usados, referencias de todo el código/datos externos, sección "Use of Super Intelligence (SI)".
- [ ] `docs/AI_USAGE.md` completo; imágenes IA con marca de agua; cero logos NASA.
- [ ] Sin fotos/voz de menores de 18.

## 6. Regla de IA (importante para cómo usamos agentes)

AI está permitida como acelerador, pero la guía 2026 dice que **no debe usarse para idear cómo resolver el reto**. Por eso: los agentes investigan y presentan opciones; **el equipo decide y lo deja en un ADR**. Todo uso de IA se declara (texto y metadatos para código; marca de agua visible en imágenes/video).

## 7. Mentores útiles para nosotros (Bloque 4: astrofísica, FITS, Aladin, pitch)

Sábado mañana y tarde: Damian Palacios (pitch, propuesta de valor), Juan Pablo Galarza (narrativa), Carlos Romero (visualización), Isaac Vásquez (herramientas web, pitch). Domingo temprano: Valeria Salazar (**UX/UI**, slides). Bloque 2 (web/FastAPI/despliegue): Jacksson Polit. Úsenlos para **validar la ciencia y ensayar el pitch**.
