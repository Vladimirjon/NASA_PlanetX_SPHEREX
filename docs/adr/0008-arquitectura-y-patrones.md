# 0008 · Arquitectura y patrones estándar (backend y frontend)

- Estado: aceptada (pedido explícito de Dax el 2026-11-14: "nivel senior, abierto a extensión, fácil de integrar")
- Fecha: 2026-11-14
- Decidido por: Dax (exigencia); propuesta técnica por agente

## Contexto
El producto crecerá en paralelo: nuevas fuentes (Gaia, WISE, nuevas entregas SPHEREx), nuevas proyecciones, nuevos modos de comparación, varias personas y agentes a la vez. Hace falta una forma única de organizar el código para que **agregar algo no obligue a modificar lo que ya funciona** (abierto/cerrado) y para que la ciencia se pueda probar sin red.

## Opciones consideradas
1. **Por capas clásico (controller → service → repo)** — conocido, pero la lógica termina acoplada a FastAPI/HTTP y a la base de datos.
2. **Clean Architecture completa** (entities/use cases/interface adapters/frameworks, con DTOs en cada frontera) — muy limpia, pero con mucha ceremonia para un equipo de 5 en 36 h.
3. **Hexagonal (puertos y adaptadores) + núcleo funcional** — el dominio y los casos de uso no conocen la infraestructura; cada integración es un adaptador que implementa un puerto. Misma regla de dependencias que Clean, con menos capas.

## Decisión
Opción 3, igual en backend y frontend.

**Regla de dependencias (obligatoria, verificada por tests de arquitectura):** `domain ← application ← adapters/api`. El dominio no importa nada externo; la aplicación solo conoce puertos (interfaces); los adaptadores implementan puertos; la **raíz de composición** es el único lugar que conecta todo.

| Capa | Backend (`backend/src/skyshift/`) | Frontend motor (`frontend/src/engine/`) | Contiene |
| --- | --- | --- | --- |
| Dominio / núcleo | `domain/` | `core/` | Valores inmutables y validados, funciones puras (HEALPix, proyecciones, agrupación de pasadas, semáforo). Sin I/O |
| Aplicación | `application/` (casos de uso) + `ports/` | `ports/` + reductores de cámara | Orquestación de un caso de uso; interfaces (`Protocol` / `interface`) |
| Adaptadores | `adapters/` (IRSA, disco, SQLite/Redis, Sesame) | `adapters/` (WebGL2, fuentes de teselas, entrada, URL) | Todo lo impuro |
| Entrada | `api/` (FastAPI, problem+json) | `ui/` (React, capa delgada) | Traduce HTTP/UI ↔ casos de uso |
| Composición | `api/app.py::create_app` | `engine.ts::createSkyEngine` | Inyección de dependencias explícita, sin singletons |

**Patrones elegidos y dónde:**
- *Puerto + adaptador* para toda integración externa → nueva fuente = nuevo adaptador, cero cambios en el dominio.
- *Strategy + registro* para proyecciones, fuentes de teselas, modos de comparación (blink, diferencia, compuesto) y almacenes de caché (disco, Redis).
- *Caché por capas* como política de aplicación (`TieredResolver`: memoria → precalculado → disco → origen) con *single-flight* y *circuit breaker* (ADR 0006).
- *Núcleo funcional, cáscara imperativa*: cálculos como funciones puras y datos inmutables (`frozen dataclass`, `readonly`), efectos solo en adaptadores.
- *Errores tipados* del dominio → mapeados una sola vez a RFC 9457 en la frontera HTTP.
- *Uniones discriminadas* para estados (tesela `idle|loading|ready|failed`, nivel `OBSERVED|EVALUATED`) con `switch` exhaustivo.

**Cómo extender (sin modificar código existente):**
- Nueva fuente de datos (Gaia, WISE, SPHEREx DR2): implementar el puerto correspondiente en `adapters/` y registrarlo en la raíz de composición.
- Nueva proyección o modo de comparación: nueva estrategia + entrada en su registro.
- Redis en lugar de disco: adaptador `BlobStore`/`KeyValueCache` elegido por configuración.

## Consecuencias
- Gana: ciencia probada sin red; integraciones nuevas aisladas; agentes en paralelo con fronteras claras.
- Cuesta: algo más de archivos; cada integración necesita su puerto.
- Ahora: tests de arquitectura que fallan si una capa importa a otra prohibida (backend `tests/test_architecture.py`; frontend regla ESLint o test equivalente).
