# Reto: Planet X and SPHEREx

**Fuente principal:** [NASA Space Apps 2026 — Planet X and SPHEREx, pestaña Details](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/?tab=details). Consultada el 13 de noviembre de 2026. Este archivo organiza el enunciado; las ideas opcionales aparecen separadas del objetivo. Los recursos están en [resources.md](resources.md).

## Ficha del reto

| Campo | Información publicada |
| --- | --- |
| Dificultad | Avanzada |
| Áreas | Astrofísica, planetas y lunas, software |
| Misión | SPHEREx, de NASA |
| Destinatarios | Público general |
| Tipo de producto | Herramienta web para visualizar imágenes del cielo a lo largo del tiempo |

## Contexto científico del enunciado

- Los asteroides y cometas orbitan el Sol; las estrellas cercanas se desplazan aparentemente en el cielo. El movimiento de la Tierra también hace que los objetos cercanos parezcan cambiar de posición.
- Comparar imágenes tomadas en momentos diferentes ayuda a identificar movimientos y a descubrir objetos. NASA pone como ejemplo el descubrimiento de Plutón al comparar imágenes de una región del cielo.
- La misión SPHEREx observa todo el cielo aproximadamente cada seis meses en **102 bandas de luz infrarroja cercana**. El enunciado indica que la cantidad de imágenes y objetos supera lo que una persona puede revisar por sí sola y plantea facilitar la participación del público.
- «Planet X» forma parte del título; el objetivo publicado pide construir la herramienta descrita a continuación. No afirma que deban descubrir un planeta nuevo para cumplirlo.

## Objetivo principal

Crear una **herramienta web de acceso público** para mostrar imágenes del cielo de SPHEREx y facilitar la observación de sus cambios con el tiempo. En concreto, el enunciado describe este flujo:

1. La persona introduce las coordenadas de una región del cielo: **ascensión recta (RA)** y **declinación (Dec)**.
2. La herramienta presenta una **serie de imágenes de esa región**, como un pequeño video.
3. La visualización debe facilitar que la persona identifique objetos en movimiento.

El enunciado habla de una serie de imágenes; no establece una cantidad mínima de fotogramas ni un diseño de interfaz específico. La herramienta se plantea para observar los cambios, sin prometer que cualquier cambio visible sea un descubrimiento confirmado.

## Objetos que el reto indica para las pruebas

NASA pide probar la herramienta con los siguientes objetos. La página no aporta coordenadas para todos ellos ni garantiza que todos sean fáciles de distinguir en cada imagen.

| Objeto | Descripción en el enunciado | Coordenadas publicadas en el enunciado |
| --- | --- | --- |
| Estrella de Barnard | Estrella | No especificadas |
| Epsilon Indi B | Par de enanas marrones que orbitan una estrella | No especificadas |
| WISE 0855 | Enana marrón de movimiento rápido | RA **08h55m10.831s**; Dec **−7d14m42.53s** |
| RW Aurigae | Estrella variable | No especificadas |
| R Draconis | Estrella variable | No especificadas |

## Consideraciones opcionales propuestas por NASA

La página dice expresamente que se **pueden considerar, pero no son obligatorias**:

- Facilitar la actualización cuando se publiquen nuevos datos de SPHEREx.
- Explorar cómo mostrar las 102 bandas. Como ejemplo, combinar por separado los datos de cada uno de los seis detectores para mejorar la relación señal/ruido; generar espectros bajo demanda se menciona como mérito adicional.
- Permitir sumar o restar imágenes de diferentes momentos.
- Permitir elegir el campo de visión; un campo mayor puede ayudar a seguir objetos rápidos, pero aumenta el tiempo de transferencia.
- Ofrecer la superposición de datos de otros telescopios, como Gaia o WISE.
- Aceptar coordenadas en la URL para facilitar la integración con otros sitios.
- Mostrar metadatos, como indicadores de contaminación.
- Considerar herramientas astronómicas públicas, entre ellas Astropy y Aladin, citadas como ejemplos en el enunciado.

## Límites de esta recopilación

- El reto pide imágenes de SPHEREx; no se ha comprobado aquí que existan suficientes imágenes útiles para cada uno de los cinco objetos ni se han ejecutado pruebas de visualización.
- La página enlaza recursos y permite que se agreguen otros. Su presencia no convierte cada recurso ni cada idea opcional en un requisito. Véase [resources.md](resources.md).
- El reparto, el stack y el diseño concreto de la solución aún no están decididos.
