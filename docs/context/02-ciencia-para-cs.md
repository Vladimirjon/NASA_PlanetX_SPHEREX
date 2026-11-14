# 02 · La ciencia explicada para gente de Computación

Todo el equipo debe poder explicar esto en el Q&A (la rúbrica lo puntúa en 1.4, 2.4 y 4.5). Las palabras nuevas también están en `docs/GLOSARIO.md`.

## 1. SPHEREx en 30 segundos

- Telescopio espacial pequeño de NASA, lanzado en 2025, en órbita baja alrededor de la Tierra.
- Ve en **infrarrojo**, la "luz de calor" justo después del rojo, invisible para nuestros ojos.
- **Fotografía todo el cielo cada ~6 meses**, barriéndolo como el haz de un faro.
- Cada pasada por la misma zona es una **época**. Una zona tiene unas pocas fotos separadas por meses: esa es nuestra "serie de tiempo".
- Mide **102 colores** de infrarrojo (0,75–5 µm) con 6 detectores (D1–D6). Por eso puede sacar el **espectro**, la "huella de color", de cada objeto.

## 2. Cómo se ubica algo en el cielo: RA/Dec

- Son la **latitud y longitud del cielo**.
- **Dec (declinación):** grados al norte o al sur del ecuador celeste (−90° a +90°).
- **RA (ascensión recta):** el ángulo alrededor del ecuador. Suele escribirse en horas (24 h = 360°, así que 1 h = 15°).
- Ejemplo: `08h55m10.8s −07°14′42″` es lo mismo que RA 133,795° y Dec −7,245°.
- Las coordenadas están fijas respecto a las estrellas lejanas. Si algo cambia de RA/Dec, **se movió de verdad**.

## 3. Por qué cambian las cosas: 4 casos

| Caso | Qué pasa (analogía) | Cómo se ve en nuestra herramienta | Objetos de prueba |
| --- | --- | --- | --- |
| **Movimiento propio** | Las estrellas giran alrededor de la galaxia. Las cercanas parecen ir más rápido, como un auto a tu lado en la autopista frente a uno lejano | La estrella se corre un poco en la misma dirección entre épocas | Barnard (10,4″/año), WISE 0855 (8,2″/año), Epsilon Indi B (4,7″/año) |
| **Paralaje** | La Tierra da la vuelta al Sol. Cierra un ojo y luego el otro: tu dedo "salta" | Un vaivén pequeño de ida y vuelta cada año, encima del movimiento propio (≤ 1″: casi invisible para nosotros) | Los mismos cercanos |
| **Estrella variable** | Cambia de brillo como un regulador de luz; no se mueve | La estrella "late" en el mismo lugar | RW Aurigae, R Draconis |
| **Asteroide** | Está muy cerca, en nuestro Sistema Solar: se mueve en minutos, no en años | Aparece en **una sola época** y en la siguiente ya no está | Hay que buscar casos reales con JPL |

**Dato clave de escala:** un píxel de SPHEREx mide **6,15″** (segundos de arco). Barnard, la estrella más rápida del cielo, se mueve unos 10″ por año: **apenas 1–2 píxeles** en toda la serie. Por eso hacen falta zoom, alineación precisa e imagen diferencia.

> ¿Qué es un segundo de arco (″)? Divide un grado en 3600 partes. La Luna llena mide unos 1800″. Un píxel de SPHEREx ve 6″: como una moneda vista a ~800 m.

## 4. Las enanas marrones (WISE 0855, Epsilon Indi B)

- Son "estrellas fallidas": demasiado pequeñas para quemar hidrógeno como el Sol.
- Son frías y brillan casi solo en infrarrojo. Por eso SPHEREx las ve y los telescopios ópticos casi no.
- Están cerca de nosotros, así que también se mueven bastante.
- WISE 0855 es de las más frías conocidas: casi invisible en los colores cortos y brillante cerca de 4–5 µm [VERIFICAR con las imágenes reales].

## 5. La trampa de la longitud de onda (lo que más puede hacernos quedar mal)

- El filtro de SPHEREx es como una **tira de arcoíris** (filtro lineal variable, LVF): cada zona del detector ve un color ligeramente distinto.
- Dos fotos de la misma estrella pueden estar tomadas en colores distintos, y el objeto puede verse brillante en uno y tenue en otro.
- Si las alternamos sin cuidado, **inventamos cambios falsos**.
- **Regla:** comparar solo imágenes de colores parecidos (mismo detector, longitud de onda cercana).
- Un jurado de ciencia puede preguntarlo; saber responderlo suma puntos de rigor.

## 6. La imagen diferencia

- Se calcula imagen B menos imagen A, después de alinearlas.
- **Lo que no cambió se cancela a gris.**
- **Una estrella que se movió** deja una pareja negro-blanco, como una huella y el lugar donde estaba el pie (se llama "dipolo").
- **Una estrella variable** deja un solo punto (blanco si se hizo más brillante, negro si se apagó).
- **Un asteroide** deja un punto que solo existe en una época.
- **Artefactos** (falsos cambios): rayos cósmicos, píxeles calientes, bordes y reflejos. Por eso un cambio en una sola imagen se verifica antes de creerlo.

## 7. Planet X / Planet Nine: la respuesta honesta

- **Planet Nine** es un planeta **hipotético**, más allá de Neptuno. Se propuso porque varias órbitas de objetos lejanos parecen "agrupadas" por la gravedad de algo grande. **No ha sido observado.**
- La mejor estimación publicada (búsqueda con Pan-STARRS1, Brown, Holman y Batygin 2024) lo ubica a ~550 UA, con brillo visual más débil que magnitud 21.
- SPHEREx en una sola pasada llega a magnitud ~18,5–19 (predicción previa al lanzamiento, Crill et al. 2025). Es decir, **el planeta sería cientos de veces más débil** de lo que SPHEREx ve. Además se movería muy poco.
- **Conclusión que sí podemos decir:** nuestra herramienta enseña **cómo se buscan** objetos así (así se descubrió Plutón en 1930: comparando placas de distintas fechas), usando objetos conocidos que sí se mueven. **No promete encontrar Planet X.** Decirlo con datos es rigor científico, no una debilidad.

## 8. Preguntas probables del jurado (respuesta corta)

| Pregunta | Respuesta en una línea |
| --- | --- |
| ¿Por qué SPHEREx y no WISE? | SPHEREx es nuevo (2025), mide 102 colores (espectro) y nadie ofrece hoy un blink público de sus datos |
| ¿Cómo saben que el cambio es real y no un error? | Mismo color en cada época, imágenes alineadas al cielo, banderas de calidad (FLAGS) y comparación con catálogos (Gaia, JPL) |
| ¿Por qué el movimiento es tan pequeño? | Píxeles de 6″ y estrellas que se mueven ~10″/año: 1–2 píxeles en la serie |
| ¿Pueden encontrar Planet X? | No con SPHEREx; sería cientos de veces más débil que su límite. Enseñamos el método con objetos reales |
| ¿Los datos son reales? | Sí: archivo IRSA de NASA/IPAC, colección DR1, con fecha y archivo de origen en cada fotograma |
| ¿Qué procesamiento hacen? | Buscar imágenes por posición, elegir la misma longitud de onda, recortar, alinear a una rejilla común, normalizar el brillo y calcular diferencias |

## Fuentes

[IRSA SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [Tutoriales SPHEREx](https://caltech-ipac.github.io/irsa-tutorials/spherex/) · Brown, Holman & Batygin 2024, AJ (búsqueda de Planet Nine con Pan-STARRS1) · Crill et al. 2025, ApJS (simulador de cielo de SPHEREx, arXiv 2505.24856) · Batygin et al. 2019, Physics Reports (arXiv 1902.10103). Movimientos propios de SIMBAD/Gaia DR3. Los datos de Planet Nine vienen de la investigación archivada (`docs/archive/v0-2026-11-13/research_deep.md`) y deben **re-verificarse** en los papers antes de ponerlos en las slides.
