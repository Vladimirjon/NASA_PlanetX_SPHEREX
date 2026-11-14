# Búsqueda de objetos — ficha para agente

- Dueño humano: responsable de producto de SkyShift.
- Estado: aprobada por Dax el 2026-11-14.
- ADRs relacionados: 0006 y 0008; se propone 0044.

## 1. Objetivo funcional
Encontrar regiones y objetos populares por sus nombres y variantes, tolerar errores de escritura y aceptar coordenadas. Consultar el catálogo local primero y CDS Sesame cuando no haya coincidencia suficientemente buena.

## 2. Entradas exactas
`GET /api/v1/search`: `q` es texto de búsqueda o coordenadas ecuatoriales; `limit` es entero entre 1 y 20. Las coordenadas decimales están en grados; la forma sexagesimal usa horas para RA y grados para Dec. RA ∈ [0, 360), Dec ∈ [-90, 90].

## 3. Salidas exactas
Lista ordenada de sugerencias con `name`, `kind` (`target`, `coordinates` o `resolver`), `ra`, `dec`, `score` y `provenance`; cuando existan, movimiento, tipo, descripción y alias coincidente. Contrato formal en OpenAPI 0.3.0 antes de implementar. Sin coincidencias: lista vacía.

Ejemplo real de posición: Barnard's Star, RA 269.44850253°, Dec 4.73942005°, época J2016.0, Gaia DR3 4472832130942575872; valores conservados de `domain/targets.py`.

## 4. Restricciones científicas
Solo datos reales con fuente y fecha; omitir nombres no resueltos y registrar las omisiones. Conservar la época de referencia real de cada posición: J2000 no significa que las coordenadas de los cinco objetivos verificados se hayan medido en el año 2000. No atribuir movimiento o paralaje ausentes a una fuente. Sin resultados no implica inexistencia del objeto.

## 5. Casos de prueba
- Válidos: alias de Messier y Bayer, errores de escritura, coordenadas decimales y sexagesimales.
- Entrada incompleta o fuera de rango: error de validación apropiado; nombre desconocido: lista vacía.
- Resolver remoto: probar con `MockTransport`; conservar procedencia y caché de 30 días.
- Propiedades: normalización idempotente, orden determinista y tolerancia a errores sobre el catálogo; documentar y resolver empates o alias ambiguos sin prometer unicidad imposible.
- Mantener pruebas de arquitectura y ejecutar pytest, ruff, pyright, validación OpenAPI y comprobación real de las ocho consultas solicitadas.

## 6. Criterio de aceptación
El dueño humano revisa contrato, resultados y catálogo con procedencia; las pruebas y comprobaciones pedidas pasan y sus salidas quedan registradas. La revisión científica confirma las épocas y los datos astrométricos antes de usarlos como mediciones.

## 7. Fuentes
- [CDS Sesame](https://cds.unistra.fr/cgi-bin/Sesame): resolución de nombres y referencias devueltas por el servicio.
- `backend/src/skyshift/domain/targets.py` y `docs/context/12-mapa-de-datos-spherex.md`: objetivos del reto y sus fuentes verificadas.
