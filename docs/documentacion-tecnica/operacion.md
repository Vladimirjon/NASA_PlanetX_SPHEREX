# Guía de operación y reproducción

**Corte:** 15-nov-2026. Complementa la [referencia técnica](README.md) y el [entorno del equipo](../context/08-entorno-y-comandos.md). Las instrucciones reflejan el repositorio, no garantizan que una instalación pública coincida con él.

## Componentes y puertos

| Componente | Comando desde la raíz | Dirección |
| --- | --- | --- |
| Producto unificado | `mise run copernix-build`, después `mise run copernix` | `http://127.0.0.1:4410/`; visor en `/viewer/`; proxy en `/api/` |
| API de desarrollo | `mise run api-dev` | `http://127.0.0.1:8000/`; documentación en `/docs` |
| Visor Copernix aislado | `pnpm --dir frontend dev:copernix` | `http://127.0.0.1:5173/viewer/`; requiere API disponible |
| Landing con proxy | `mise run landing` | `http://127.0.0.1:4410/`; requiere API separada para `/api/` |

En Windows y Fedora, instalar las herramientas fijadas por `mise.toml`; seguir `mise trust`, `mise install`, `mise run setup`. Para frontend aislado, instalar dependencias con `pnpm --dir frontend install --frozen-lockfile`. Alternativa para iniciar solo la API sin mise: `uv run --locked --directory backend uvicorn --factory skyshift.api.app:create_app --port 8000`. El build Copernix es `pnpm --dir frontend build:copernix`. No se necesita activar manualmente un entorno Python.

## Comprobaciones básicas

Con el producto en ejecución:

```text
curl http://127.0.0.1:4410/api/v1/health
curl "http://127.0.0.1:4410/api/v1/search?q=Barnard&limit=5"
```

La respuesta de salud verifica que la API responde y muestra el estado del circuito; **no demuestra** que IRSA entregue una observación, que el mapa funcione o que los datos sean científicamente comparables. Abrir el visor, buscar un objeto, cargar una serie real y revisar sus fechas y procedencia. El smoke de cinco objetos `mise run smoke` necesita la API activa y acceso a servicios externos; sus resultados dependen del momento.

## Configuración de API

Variables `SKYSHIFT_` definidas en [config.py](../../backend/src/skyshift/config.py). No incluyen credenciales. En la siguiente tabla, los límites son los del modelo de configuración; no son capacidades garantizadas de producción.

| Variable | Predeterminado | Propósito |
| --- | --- | --- |
| `SKYSHIFT_CACHE_DIR` | `.cache/skyshift` | Directorio de caché local. |
| `SKYSHIFT_PRECOMPUTED_DIR` | sin definir | Directorio opcional de productos precalculados. |
| `SKYSHIFT_HIPS_BASE_URL` | IRSA SPHEREx all-sky cube | Origen de teselas HiPS. |
| `SKYSHIFT_HIPS_MAX_PARALLEL` | `6` | Máximo de solicitudes HiPS paralelas; rango 1–32. |
| `SKYSHIFT_UPSTREAM_TIMEOUT_S` | `20` | Tiempo de espera de origen en segundos; mayor que 0 y hasta 120. |
| `SKYSHIFT_MEMORY_CACHE_MB` | `256` | Presupuesto de caché en memoria; rango 16–4096 MiB. |
| `SKYSHIFT_CORS_ORIGINS` | lista vacía | Orígenes permitidos cuando son necesarios; el despliegue de un origen evita requerirlos para el navegador. |

El resolutor consulta memoria, datos precalculados opcionales, disco local y origen. Deduplica solicitudes simultáneas por clave, valida contenido y puede servir una copia local caducada marcada como tal cuando falla el origen. El cortacircuitos limita solicitudes repetidas tras errores; consultar [código](../../backend/src/skyshift/application/tiered_cache.py) y [ADR 0040](../adr/0040-arquitectura-base-cache-y-motores.md). El funcionamiento varía según el adaptador y el estado de caché; no equivale a disponibilidad offline completa.

## Fallos frecuentes

| Síntoma | Comprobación y acción |
| --- | --- |
| `502` en `/api/` | Comprobar que la API escucha en el puerto esperado y que el proxy apunta a ella. |
| `503` o serie ausente | Revisar respuesta y origen; IRSA puede fallar o no haber observaciones utilizables. Reintentar; usar solo respaldo previamente comprobado. |
| Mapa vacío o problema de GPU | Revisar consola y WebGL2; el visor documenta `?map=off` para mostrar solo el panel de serie. Ver [visor](../../frontend/copernix/README.md). |
| Falta un recurso FITS | No está versionado. Regenerar y comprobar el [paquete D3](../../data/packages/eps-indi-b-d3/README.md); requiere red y espacio local. |
| Fuentes del visor no cargan | Verificar que el build y despliegue sirven `/viewer/fonts/`; el build puede dejar esas rutas para resolución en ejecución. |
| Cambios no aparecen en público | Verificar build, empaquetado y versión desplegada; HTTP 200 no demuestra que el contenido sea la última revisión. |

## Despliegue y recuperación

La URL pública indicada por el equipo es [demo.copernix.workers.dev](https://demo.copernix.workers.dev/). El 15-nov-2026 la página y `/api/v1/health` respondieron HTTP 200 en esta revisión; no se comprobó disponibilidad continua. [STATE](../STATE.md) conserva la última información operativa del equipo.

Antes de presentar, abrir la demo sin sesión, revisar landing, mapa, búsqueda, caso y procedencia; ensayar un respaldo verificando qué datos contiene. No revelar credenciales en repositorio, capturas ni logs. Para errores de datos o conclusiones, involucrar al responsable de ciencia; no reemplazar datos faltantes por cifras ficticias.
