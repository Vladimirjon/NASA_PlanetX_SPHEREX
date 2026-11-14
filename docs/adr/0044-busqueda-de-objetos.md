# 0044 · Búsqueda local de objetos

- Estado: aceptada para implementación según ficha 0040 aprobada por Dax.
- Fecha: 2026-11-14.
- Decidido por: Dax (alcance); detalle técnico propuesto por Codex.

## Contexto
La búsqueda debe tolerar variantes y errores, conservar procedencia y funcionar sin conexión para objetos populares.

## Opciones
1. Resolver siempre en Sesame: catálogo amplio, dependiente de red.
2. Catálogo local y respaldo Sesame: rápido sin conexión, necesita regeneración y revisión de datos.

## Decisión
Usar catálogo local generado desde Sesame, cinco objetivos verificados del proyecto, puntuación determinista y respaldo con caché de 30 días. Las coordenadas introducidas se interpretan primero. Mantener época, referencia y fuente; no inferir la época a partir del marco J2000.

## Consecuencias
Se puede buscar sin red, pero el catálogo no es exhaustivo. Se registran omisiones y se propagan errores del servicio remoto; las coincidencias no prueban una detección científica.
