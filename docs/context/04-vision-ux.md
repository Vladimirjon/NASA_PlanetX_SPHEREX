# 04 · Visión y UX (prioridad #1) — investigación + opciones para decidir

Estado: **investigación**. Las decisiones las toma el equipo (regla de IA del evento) y se registran en `docs/adr/`. Investigado el 14-nov-2026; fuentes al final.

## 1. La visión del equipo (palabras de Dax)

> Que **cualquier persona** pueda identificar y entender cualquier cambio en una región del cielo, con comparación visual de imágenes, y que pueda **profundizar como experto** si quiere.

## 2. Hallazgo clave: el hueco está libre

No existe una herramienta pública que muestre las épocas de SPHEREx como blink o time-lapse.
- **IRSA SPHEREx Data Explorer** (oficial) muestra hasta 8 imágenes alineadas, compuestos de color y "auto play" escondido. No tiene blink, diferencia, agrupación por época ni guía para novatos. Es para profesionales.
- Lo más parecido es un notebook de Python de IRSA, que tarda unos 5 minutos en armar la serie de una sola posición.
- **Conclusión:** "hacer accesibles los datos de SPHEREx a cualquiera" encaja exactamente con la categoría *Best Use of Data*.

## 3. Lo que dice la evidencia sobre comparar imágenes

**Ceguera al cambio** (Rensink 1997): sin pistas, una persona puede tardar unos 20 s en ver incluso cambios grandes cuando dos imágenes alternan. Mostrar el cambio no basta; **hay que guiar la atención**.

| Patrón | Movimiento propio (1–2 px) | Cambio de brillo (variables) | Asteroide (aparece en una sola época) |
| --- | --- | --- | --- |
| **Blink / loop en el mismo lugar** (1–2 Hz, zoom 4–8×, píxeles sin suavizar) | **Principal**: el cerebro ve "movimiento aparente" | Bueno (se ve "latir") | Bueno (el punto aparece y desaparece) |
| **Imagen diferencia** (época N − referencia) | Capa experta: un par negro/blanco ("dipolo") = algo se movió | **Principal**: mancha aislada | **Principal**: mancha aislada |
| **Compuesto de color por época** (época 1 en un color, última en otro) | **Principal en vista estática**: "estrella doble" de dos colores | Desbalance de color | Punto de un solo color |
| Lado a lado | Débil para cambios pequeños (Erickson 2011) | Medio | Medio |
| Deslizador (swipe) | Débil: el cambio es más chico que el control | Medio | Medio |
| Superposición con opacidad | Medio | Débil | Débil |
| **Resaltado "aquí cambió"** (anillo + flecha) | Imprescindible **después** de que la persona lo intente | Anillo + curva de luz | Anillo + "solo en época 3" |

Lectura simple: **loop por defecto**, la **diferencia a un toque**, el **compuesto de color** como vista estática (para capturas y para quien no tolera animación) y **pistas solo si las pide o tras unos 5 s**, para no robarle el "¡lo encontré!".

## 4. Qué tomar y qué evitar de herramientas existentes

| Herramienta | Idea para tomar | Error a evitar |
| --- | --- | --- |
| WiseView (WISE) | Coordenadas → blink inmediato, velocidad y zoom | Controles crudos sin explicar; solo para expertos |
| Backyard Worlds (Zooniverse) | Tutorial con ejemplos de "objeto que se mueve" vs "artefacto"; guía de campo siempre al lado | Pasar fotogramas a mano; nunca te dice si acertaste |
| Supernova Hunters | Tres paneles: nuevo, referencia, diferencia; botón "¿Necesitas ayuda?" | Interfaz genérica |
| IRSA Data Explorer | Imágenes alineadas al cielo y mismo contraste en todas | Menús densos, sin guía |
| Aladin Lite v3 | Mapa del cielo con zoom para responder "¿dónde estoy?" | Más de 1000 capas abruman al novato |
| Legacy Surveys | Blink definido en la URL; espacio para alternar capas | El blink está escondido |
| Rubin First Look | Trazas de asteroides en colores; tours educativos; funciona en móvil | Es una vitrina, no tu propia búsqueda |
| Google Earth Timelapse | Línea de tiempo siempre visible; "Stories" guiadas; enlaces profundos | Mirar pasivamente; no cuantifica |

## 5. Modelo de 3 capas (divulgación progresiva), propuesta para discutir

1. **Mirar (cualquier persona, < 60 s):** un solo buscador (nombre o RA/Dec, con ejemplos de un clic). El loop arranca solo. Texto simple: "6 meses entre cada imagen". Una pregunta: "¿Algo se movió, cambió de brillo o apareció?" → revelación con anillo y una frase de explicación.
2. **Comparar (curioso):** barra con blink, diferencia, compuesto de color y swipe. Línea de tiempo con fechas. Un "?" en cada control. Guía de campo con ejemplos de objeto que se mueve, variable, asteroide y artefactos (rayo cósmico, píxel caliente, borde, reflejo).
3. **Inspeccionar (experto):** contraste (asinh/lineal), paleta de color, valor del píxel, longitud de onda/detector, desplazamiento medido en px y segundos de arco con el movimiento propio implícito, cruce con Gaia/SIMBAD, enlace a los archivos FITS de IRSA y descarga. Cada número tiene un "¿cómo lo calculamos?".

Sin tour modal al inicio: 3 indicaciones breves solo la primera vez que se reproduce, más un botón "Muéstrame cómo" siempre disponible.

## 6. Accesibilidad obligatoria

- **Parpadeo (WCAG 2.3.1):** máximo 3 destellos por segundo. Tope de velocidad 2,5 Hz. Sin alternancia roja saturada a pantalla completa. Área que parpadea pequeña o con contraste reducido.
- **Pausa (WCAG 2.2.2):** botón de pausa visible y tecla Espacio.
- **Movimiento reducido:** con `prefers-reduced-motion`, mostrar por defecto el compuesto de color o la diferencia, con paso manual entre fotogramas.
- **Color:** imagen en escala de grises con estiramiento asinh por defecto; opciones cividis/viridis; **nunca** arcoíris/jet. Compuesto de época en pares seguros para daltonismo (magenta/verde o naranja/azul) y siempre con etiqueta o forma además del color.
- **Proyector:** píxeles sin suavizar (`image-rendering: pixelated`), texto ≥ 18 px, alto contraste y tema claro opcional (el oscuro se lava en proyector).
- **Teclado y lector de pantalla:** ←/→ para cambiar de fotograma, B para blink, D para diferencia; una región "live" que describe en texto el cambio medido.

## 7. Ideas diferenciadoras (factibles en ~18 h) — para que el equipo elija

1. **"Encuéntralo primero":** el loop corre, la persona toca dónde cree que está el cambio; luego se revela la respuesta y el tiempo que tardó. Combate la ceguera al cambio y hace la demo interactiva para el jurado.
2. **Estela de movimiento:** puntos de cada época que se desvanecen y una flecha, con lectura simple: "se movió 1,4 px ≈ 9″ en 1 año: probablemente una estrella cercana".
3. **Mini curva de brillo** bajo el loop, sincronizada con el fotograma: la variabilidad se entiende sin jerga.
4. **"Postal del cielo" compartible:** URL profunda + GIF con texto generado. Suma al criterio de impacto.
5. **Coach "¿artefacto o real?":** si algo aparece en una sola época, 3 preguntas guiadas (¿se mueve?, ¿parece estrella?, ¿es un asteroide catalogado?). Enseña escepticismo científico.
6. *(Del reto, "extra kudos")* **Espectro al vuelo:** el brillo del objeto en las bandas de SPHEREx (la "huella de color"). Diferencia a SPHEREx de WISE.

## 8. Demo y storytelling (patrones que funcionan con jurados)

- **Primeros 10 s:** abrir con una estrella de alto movimiento propio ya en loop y una frase grande: "Esta estrella se movió. Estás viendo 1 año de datos de SPHEREx (NASA)". Luego escribir una coordenada nueva en vivo.
- **Modo historia:** recorridos guiados para los 5 objetos de prueba, cada uno en 3 tarjetas: pregunta → revelación → por qué importa.
- **Cierre:** "Prueba tu propio cielo", con el buscador abierto (conecta con democratizar datos).

## 9. Decisiones que el equipo debe tomar (luego ADR)

1. ¿Cuál es el **"momento wow"** de la demo? (opciones: ver la estrella moverse, encontrar el cambio uno mismo, el espectro de SPHEREx…)
2. ¿Qué **2–3 diferenciadores** de §7 entran y cuáles quedan para la hoja de ruta?
3. ¿Las 3 capas son **modos explícitos** (pestañas) o se revelan solas al interactuar?
4. ¿Tema base oscuro (estética espacial) o claro (legibilidad en proyector), y con cuál se presenta?
5. ¿Hay **asteroide real** en datos de SPHEREx para mostrar? (pendiente: investigación de ciencia/APIs)

## Fuentes

IRSA: [visualización SPHEREx](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html), [tutorial de recortes](https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts), [cutout tool](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html) · Backyard Worlds: [WiseView](https://blog.backyardworlds.org/2017/09/13/wiseview/), [guía de clasificación](https://blog.backyardworlds.org/2017/06/28/a-guide-to-classifying-objects-on-backyard-worlds-planet-9-from-the-point-of-view-of-a-citizen-scientist/), [fast movers](https://blog.backyardworlds.org/2017/02/19/fast-movers-are-they-planet-9/) · [Supernova Hunters](https://www.zooniverse.org/projects/dwright04/supernova-hunters/about) · [Legacy Surveys tips](https://a.legacysurvey.org/svtips) · [Aladin Lite](https://aladin.cds.unistra.fr/AladinLite/doc) · Rubin: [moving objects](https://rubinobservatory.org/education/first-look-lasting-impact-resources-for-educators/unpacking-first-look-images-2/rubins-opening-act-moving-objects-first-look), [tours](https://fl.rubinobservatory.org/education/first-look-lasting-impact-resources-for-educators/skyviewer-education-tours) · [Google Earth Timelapse](https://www.research.google/blog/an-inside-look-at-google-earth-timelapse/) · Percepción: [Rensink 1997](https://homepage.villanova.edu/diego.fernandezduque/Teaching/CognitivePsychology/Lectures_and_Labs/s3Attention/sReading/Rensink_etal_97.pdf), [Erickson 2011](https://www.ajnr.org/content/32/9/1652), [CHI '26 slide](https://arxiv.org/html/2602.19048v1), [Gleicher](https://par.nsf.gov/servlets/purl/10062070), [L'Yi](https://arxiv.org/pdf/2009.00192v1.pdf), [Lappin 2001](https://cdn.vanderbilt.edu/vu-my/wp-content/uploads/sites/762/2014/08/11093310/LappinEtAl.VR_.2001.pdf) · WCAG: [2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), [2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) · [cividis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6070163).

No verificado: si Cool Neighbors ya tiene blink automático; tamaños de efecto del estudio de imágenes aéreas. Las filas de ESASky, NASA Eyes, WWT y Stellarium vienen de conocimiento general, no de páginas leídas hoy.
