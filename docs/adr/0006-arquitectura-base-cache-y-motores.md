# 0006 · Arquitectura base: dos pistas, caché por capas y motores

- Estado: aceptada (aprobada por Dax el 2026-11-14)
- Fecha: 2026-11-14
- Decidido por: Dax (dirección: visor propio sin Aladin, caché local antes que la API oficial, motores optimizados si hacen falta). Detalle técnico propuesto por agente.
- Reemplaza en parte: ADR 0003 (fila "Mapa del cielo: Aladin Lite" y "Caché: diskcache sin Redis").

## Contexto
El producto debe funcionar para **cualquier RA/Dec**, no solo para los 5 objetos del reto, y ser rápido aunque IRSA esté lento (hoy da 502 y TAP tarda minutos). Dax decidió: (1) **visor del cielo propio** con paridad visual con Aladin, sin usar Aladin; (2) servir **primero desde copia local** y solo si no existe ir a la API oficial; (3) usar Rust/Redis **si es necesario**. Aladin Lite es GPL-3.0 y nuestro repo es MIT: no se puede copiar su código.

## Opciones consideradas
1. **Rust en todo el pipeline de imágenes** — rápido, pero reimplementar WCS TAN-SIP y reproyección es investigación; astropy/reproject ya son C/Cython.
2. **Python + caché por capas, Rust solo donde una medición lo pida** — correcto hoy, optimizable mañana sin romper contratos.
3. **Redis obligatorio** — compartido entre procesos, pero agrega un servicio que instalar en Fedora/Windows y en el hosting.

## Decisión
Opción 2, con estas piezas:

**Backend (Python 3.13 + FastAPI, arquitectura hexagonal):**
- `domain/`: tipos puros validados (`SkyPosition`, `Observation`, `Visit`, `Frame`, `Provenance`, `InterpretationLevel` = OBSERVED | EVALUATED; **CONFIRMED no existe en el código**).
- `ports/`: `ObservationCatalog`, `ImageSource`, `BlobStore`, `KeyValueCache`, `TileSource`, `NameResolver`.
- `adapters/`: IRSA SIA2 (httpx), recortes IRSA, almacén local en disco, KV SQLite (por defecto) o Redis (opcional), HiPS de IRSA, Sesame (CDS) para nombres.
- **Resolvedor por capas ("redireccionador")**, igual para catálogos, recortes y teselas:
  `L1 memoria (LRU)` → `L2 disco local (direccionado por contenido, SHA-256, escritura atómica)` → `L3 IRSA oficial`.
  Con: deduplicación de peticiones simultáneas (single-flight), timeouts, reintento con espera, cortacircuitos si IRSA falla, y **procedencia en cada respuesta** (`cache: memory|local|origin`, fecha de obtención, URL de origen). Un dato viejo nunca se presenta como nuevo.
- **Precarga**: los 5 objetos del reto se precalculan en L2 (`mise run precompute`) → la demo funciona sin IRSA.
- **Redis**: adaptador opcional por variable de entorno (`SKYSHIFT_KV=redis://…`). Por defecto SQLite: cero servicios extra, funciona igual en Fedora y Windows. Se activa Redis solo si desplegamos varios procesos.

**Visor del cielo propio (TypeScript + WebGL2, motor sin framework):**
- `frontend/src/engine/`: proyecciones (SIN por defecto, TAN, AIT), matemática HEALPix NESTED, selección de teselas visibles por orden 0–5, caché LRU de texturas, carga progresiva (padre borroso → hijo nítido), cancelación, inercia, cuadrícula RA/Dec, clic → RA/Dec, estado en URL.
- Construido desde el estándar IVOA HiPS 1.0 y observando el **comportamiento** de Aladin; **prohibido copiar código de Aladin** (GPL).
- Las teselas PNG son solo para ver; **ninguna medición se hace sobre PNG** (las mediciones usan FITS en el backend).

**Rust:** no entra en v0.1. Candidato medido después: Rust→WASM para decodificar teselas FITS float del cubo en el navegador (estiramiento científico por banda) si el perfilado muestra que JS no alcanza 60 fps. Cualquier entrada de Rust requiere benchmark antes/después en el PR.

## Consecuencias
- Gana: funciona con IRSA caído; mismas reglas de caché para todo; contratos estables para optimizar después.
- Cuesta: disco local (límite configurable, limpieza LRU solo de lo que el sistema descargó); el visor propio es la pieza de mayor riesgo de tiempo.
- Ahora: contrato `contracts/openapi.yaml` v0.1, fichas 0002 (analizador) y 0003 (visor), mapa de datos de física (`docs/context/12`).
