# Exploración temporal y caché local — ficha de investigación

- Dueño humano: Dax (aprobación de la ficha base; responsables de módulos pendientes).
- Estado: **aprobada por Dax el 14-nov-2026 como base de exploración y caché**; detalles y módulos posteriores requieren ficha propia.
- ADRs relacionados: 0003 (stack propuesto, sin aprobar).

## Objetivo y alcance

El objetivo es explorar múltiples regiones y coordenadas libres en todo el cielo. WISE 0855 es solo un primer caso de prueba, porque ya existen recortes reales de distintas fechas en el experimento local. Ver `docs/context/09-referencia-irsa-exploracion.md`. La presencia de archivos no demuestra que se vea movimiento: validar científicamente antes de crear una historia sobre un cambio. Extender después a las otras regiones del reto y a RA/Dec libres.

Mantener un flujo guiado de mapa celeste → región → observaciones disponibles → comparación temporal → origen y límites. Un mapa esférico interactivo puede orientar la exploración; representar objetos con profundidad física exige distancias trazables y sus incertidumbres, no inferirlas de una imagen 2D. La decisión de UX corresponde al equipo.

## Entradas propuestas

- Coordenadas ecuatoriales RA/Dec en grados y sistema de referencia explícito; límites RA [0, 360) y Dec [-90, 90].
- Tamaño angular acotado; colección/versiones, fecha o época, detector y requisitos espectrales explícitos. Límites concretos y unidades pendientes de validar por el equipo.
- Cada búsqueda de IRSA debe conservar consulta, hora, respuesta, origen y caducidad; cada imagen conserva identificador, colección, fecha, longitud de onda, WCS y calidad disponibles.

## Comportamiento de caché propuesto (aún no implementado en el producto)

1. Consultar índice local; si hay un resultado adecuado, devolverlo con su procedencia y fecha de obtención. Si no, consultar IRSA con límites, tiempos máximos y errores visibles.
2. Guardar solo datos efectivamente solicitados o una precarga pequeña autorizada; no descargar todo el archivo. Escribir temporalmente, validar el archivo y publicar atómicamente. Una solicitud repetida simultánea debe reutilizar el trabajo en curso.
3. Distinguir datos sin conexión de resultados vigentes: mostrar fecha de consulta y permitir revalidación. Un fallo de red no debe presentar datos viejos como nuevos.
4. Caché de consultas con caducidad; FITS identificados por URL/colección/versión y parámetros de recorte; productos procesados identificados además por región, parámetros de alineación y versión del procesamiento. Conservar procedencia, SHA-256 e indicar validación científica pendiente.
5. Limitar almacenamiento, trabajos y tamaño por solicitud; permitir limpieza sin borrar archivos originales no gestionados por el sistema. Sin secretos y sin rutas arbitrarias ni URLs externas proporcionadas por el cliente.
6. Un backend guarda su caché **en el disco de la máquina donde corre**. Los navegadores que se conectan al mismo backend la comparten. Backends distintos no comparten datos automáticamente: para ello haría falta un almacenamiento común o importación/exportación, pendientes de diseño, seguridad y decisión del equipo.

## Salidas propuestas

Resultados con estado (en caché / descargando / disponible / sin datos / error), fechas, colección, coordenadas, λ, enlaces de origen y motivo de incompatibilidad. No inventar ni interpretar un cambio como confirmado. La demostración actual está fuera del repo en `~/Desktop/skyshift-demo` y no es el backend de producto.

## Criterios y pruebas pendientes de definir con ciencia

- Misma región y cobertura, fechas, WCS, λ específica de la posición, FLAGS, incertidumbre y procedencia; mismo detector por sí solo no demuestra compatibilidad.
- Pruebas de caché: acierto sin red, fallo sin caché, descarga incompleta, consultas concurrentes, espacio máximo, invalidación por parámetros y diferencia entre dos backends.
- Validar reproducibilidad de un primer caso real y probar las otras regiones del reto; no asumir que el movimiento es visible.
- Pruebas de accesibilidad, navegación, rendimiento y respaldo sin conexión antes de la demo.

## Fuentes

- [IRSA: acceso a datos y SIA2](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/).
- [IRSA: visualización y longitud de onda según el píxel](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html).
- [ESA: paralaje y distancia](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Parallax).
