# R3 · Revisión de rendimiento del motor de cielo (pista B)

**Veredicto: CAMBIOS REQUERIDOS**

Rama `feat/sky-engine` en `0e5126f`. Revisión de solo lectura: no se cambió código. Ficha 0003 §6, presupuesto en 06 §4, ADR 0006/0007. **No existe `docs/adr/0008`** en este worktree.

## Resumen

| Meta | Medido | Estado |
| --- | --- | --- |
| JS inicial ≤ 180 KB gzip | 76,0 KB (vite) / 74,9 KB (`gzip -9`) | OK |
| Primer cuadro de todo el cielo con caché < 1,5 s | 148 ms (GPU real) · 233 ms (SwiftShader) | OK |
| Primer cuadro en frío < 6 s | 3 606 ms (GPU real) · 2 678 ms (SwiftShader), limitado por la red de IRSA | OK |
| Arrastre ≥ 55 fps p95 en GPU integrada | p95 16,7 ms = 59,9 fps en Radeon 780M; igual con CPU ×4 más lenta | OK |
| Ninguna tesela pedida dos veces por sesión | **4–7 URL repetidas en 5 s de arrastre; 175 URL (287 peticiones de más) en 2 min** | **FALLA** |
| Peticiones canceladas al salir del campo | Sí (23 canceladas en red tras un paneo rápido), pero se cancela de más: 65 % de las peticiones | Parcial |
| Memoria GPU acotada (LRU ≤ 256) | Acotada: 256 bitmaps como máximo y un arreglo fijo de 256 capas. Costo: 256 MiB de VRAM más hasta 256 MiB de bitmaps para datos en gris | Acotada, pero cara |
| Fotograma sin reservar memoria (06 §4) | 96 KB nuevos y una textura reasignada en cada cuadro | **FALLA** |
| Fuga de memoria JS en 2 min | El heap tras GC pasa de 1,91 a 3,65 MB y se estabiliza; DOM 1 015 nodos | Sin fuga |
| Tareas largas > 50 ms | 1–3 al cargar (60–132 ms, compilación de shader); 0–2 durante la interacción | Menor |

## Entorno y método

- Build de producción (`vite build`) servido con `vite preview` en 127.0.0.1:5175. Ventana de 1280×800, DPR 1, red real a IRSA (HTTP/2). Chromium 1228 con Playwright 1.65.2.
- **GPU real:** `--use-angle=gl --enable-gpu --ignore-gpu-blocklist` → `ANGLE (AMD, AMD Radeon 780M Graphics (radeonsi phoenix ACO), OpenGL 4.6)`, una GPU integrada. Probé `--use-gl=egl` (con y sin `--headless`) y sigue usando SwiftShader. `--use-angle=vulkan` también da la 780M (RADV).
- Instrumentación propia inyectada antes de la app (`r3-evidencia/instrument.js`):
  - marcas de tiempo de `requestAnimationFrame`;
  - un envoltorio de `fetch` que mide simultaneidad, abortos y URL repetidas;
  - contadores de `texImage2D`, `texSubImage3D` y `getUniformLocation`;
  - el tiempo de GPU de `drawArrays` con `EXT_disjoint_timer_query_webgl2`;
  - el número de `ImageBitmap` vivos y las tareas largas.
- El heap se lee por CDP (`HeapProfiler.collectGarbage` y luego `Runtime.getHeapUsage`). El perfil de CPU y la traza se toman por CDP.
- Scripts y JSON crudos están en `docs/reviews/sky-engine/r3-evidencia/`.
- Límite del método: Chromium sin interfaz limita rAF a 60 Hz, así que los intervalos no bajan de 16,7 ms. El margen se ve en el costo por cuadro (GPU 0,4 ms; script 2,3 ms por evento).

## Mediciones

### 1. Primer cuadro completo (todo el cielo, vista por defecto)

Se considera completo cuando no hay peticiones en vuelo durante 600 ms y pasan dos rAF. El 60 % del lienzo queda con datos, que es la elipse AIT.

| Modo | Frío | Caliente (recarga, caché HTTP) | Peticiones | Repetidas |
| --- | --- | --- | --- | --- |
| Radeon 780M | 3 606 ms | 148 ms | 12 | 0 |
| SwiftShader | 2 678 ms | 233 ms | 12 | 0 |

IRSA no envía `Cache-Control`; solo `ETag` y `Last-Modified` (`curl -I .../Norder0/Dir0/Npix0.png`). La carga en caliente depende de la frescura heurística del navegador.

### 2. Arrastre de 5 s (WISE 0855, FOV 10°, banda 19, circular)

| Modo | Intervalo p50/p95/máx | fps p95 | Cuadros > 18 ms | GPU draw p50/p95 | Script/tarea total |
| --- | --- | --- | --- | --- | --- |
| Radeon 780M | 16,7 / 16,7 / 16,8 ms | 59,9 | 0 | 0,34 / 0,41 ms | 375 / 697 ms (182 eventos) |
| Radeon 780M, CPU ×4 | 16,7 / 16,7 / 16,8 ms | 59,9 | 0 | — | 990 / 1 830 ms (151 eventos, unos 6,6 ms por evento) |
| SwiftShader | 16,7 / **33,3** / 33,5 ms | 30,0 | 21 | sin timer | 182 / 3 223 ms |

En el mismo arrastre (780M):

- 51–59 peticiones para 43 URL únicas, es decir, **4–7 URL repetidas**, y 11–19 abortadas. Ejemplo: `Norder3/Npix424` se pidió 5 veces y las 5 se abortaron; `Norder4/Npix1698`, igual 5 veces.
- 182 `texImage2D` en 182 cuadros, 364 `getUniformLocation` y 182–281 recálculos de layout.

El autoinforme `perf.md` decía 16,70 ms p95 en SwiftShader y 0 repetidas. **No se reproduce:** en SwiftShader el p95 es de 33,3 ms y sí hay repetidas.

### 3. Zoom de FOV 180° a 0,5° (rueda, 148 pasos, unos 7,4 s)

- **780M:** p95 16,7 ms. GPU draw p50/p95/máx 0,36 / 0,52 / 0,88 ms. 98 peticiones durante el zoom (110 en total), 2 URL repetidas, 58–60 abortadas, 16 como máximo en vuelo. Ninguna tesela quedó pendiente al terminar.
- **SwiftShader:** p95 33,3 ms. 115 peticiones, 2 repetidas, 51 abortadas. Una tarea larga de 208 ms.

### 4. Paneo rápido lejos de la vista (caché fría, FOV 1°, 25 arrastres en 1,5 s, unos 21°)

45 peticiones, 23 abortadas (`Network.loadingFailed canceled=true` = 23) y 9 en vuelo al soltar. Todo se asentó 2 480 ms después. No hubo URL repetidas. **La cancelación funciona.**

### 5. Prioridad de carga en frío (WISE, banda 19)

| Vista | Peticiones | KB totales | KB de orden 0 | Arranque de la primera tesela de orden 5 | Última de orden 5 |
| --- | --- | --- | --- | --- | --- |
| FOV 1° | 17 | 1 464 | **1 096 (75 %)** | **1 122 ms** (espera un hueco) | 3 356 ms |
| FOV 4° | 27 | 2 065 | 1 096 (53 %) | **1 985 ms** | 4 749 ms |

### 6. Comparación con IRSA/Aladin (misma vista: FOV 1°, frame 20/102 = 1,167 µm = nuestra banda 19, GPU 780M)

| Visor | Peticiones de teselas en frío | Última tesela (frío) | Recarga |
| --- | --- | --- | --- |
| IRSA / Aladin Lite | 3 (2 únicas; Norder2 y Norder5) | 3 539 ms | 1 petición, 804 ms |
| SkyShift | 17 (Norder0–5) | 3 380 ms | 17 desde caché, 60 ms |

El tiempo hasta la vista completa es parecido porque domina la latencia de IRSA. SkyShift baja **unas 6 veces más teselas**.

### 7. Memoria tras 2 min de paneo aleatorio (780M; arrastre, rueda y cambio de banda)

| t (s) | Heap tras GC (MB) | ImageBitmap vivos |
| --- | --- | --- |
| 0 | 1,91 | 32 |
| 30 | 3,47 | 86 |
| 60 | 3,53 | 111 |
| 90 | 3,59 | 169 |
| 120 | 3,65 | 238 |

- **Tráfico:** 675 peticiones, 388 únicas, **437 abortadas (65 %)**, **175 URL repetidas (287 peticiones de más)**, 16 como máximo en vuelo.
- **GPU:** 568 `texSubImage3D` para 238 bitmaps creados. Eso son unas 2,4 subidas por tesela, porque al cambiar de banda se pierden los huecos. En total 512 ms de CPU, unos 0,9 ms por subida.
- **Calls por cuadro:** 3 017 `texImage2D` (uno por cuadro) y 6 036 `getUniformLocation`.
- **Prueba de desalojo** (`evict.py`, 70 paneos de una pantalla): los bitmaps vivos se quedan en **256 con 353 creados**. El LRU los cierra; el heap pasa de 1,75 a 2,87 MB. El RSS de los procesos (`ps`) es ruidoso y no lo uso como evidencia.

### 8. Tareas largas y perfil de CPU (780M, carga, zoom y arrastre)

- **Tarea larga del primer cuadro (60–132 ms):** la traza muestra `FireAnimationFrame` de 61 ms. De ellos, 41,7 ms son `GLES2::GetGLError` y `CommandBufferHelper::Finish`, una espera síncrona a la GPU. A eso se suma un `GPUTask` de WebGL de 69 ms: es la compilación del shader.
- **Mayor tiempo propio de JS:** `write` (`history.replaceState`), **112 ms**.
- Luego `ang2pix` 98 ms, `render` del renderer 97 ms, `visibleCells` 73 ms, `unproject` 32 ms, `pointAt` 23 ms, GC 45 ms y `texSubImage3D` 26 ms.
- Durante 7 s de arrastre hubo 600 `replaceState`, uno por evento de puntero. Chromium no dio aviso.

## Hallazgos

### BLOCKER

**B1. Abortos por parpadeo de la selección: la misma tesela se pide hasta 5 veces y 65 % del tráfico se tira.**

- **Medido:** 4–7 URL repetidas en 5 s de arrastre; 2 en el zoom; 175 URL (287 peticiones de más) y 437 de 675 abortadas en 2 min. Esto incumple la ficha 0003 §6: "ninguna tesela pedida dos veces".
- **Dónde:** `frontend/src/engine/engine.ts:38-39` recalcula `wanted` en cada cuadro y aborta al instante todo lo que no esté. `frontend/src/engine/core/tiles/selection.ts:26-31` muestrea una rejilla de 21×21 puntos, así que las teselas del borde, incluidos los padres de orden 2–4, entran y salen cuadro a cuadro.
- **Agravante:** un cuerpo abortado a medias no queda en la caché HTTP. Por eso cada nuevo intento va otra vez a IRSA (0 respuestas desde disco en el paneo).
- **Arreglo, en este orden:**
  1. **Histéresis:** abortar solo si la tesela lleva más de 300–500 ms fuera de una vista ampliada (por ejemplo, el viewport ×1,5 o `wanted` más los vecinos de `neighbours()`).
  2. Nunca abortar teselas de orden ≤ 2, que son el respaldo.
  3. No abortar si la respuesta ya llegó (cabeceras recibidas); dejar que el cuerpo termine y guardarlo en el LRU.
  4. Test: contador de URL por sesión = 1 en un arrastre circular scriptado.

### MAJOR

**M1. Prioridad invertida y 12 teselas de orden 0 siempre.**

- **Medido:** a FOV 1°, el 75 % de los bytes (1 096 de 1 464 KB) es orden 0. La única tesela de orden 5 necesaria arranca a los 1 122 ms porque espera un hueco del tope de 16. A FOV 4°, las de orden 5 arrancan entre 1,98 y 3,0 s. Aladin pide 3 teselas y SkyShift 17.
- **Dónde:** `selection.ts:25` agrega siempre los 12 píxeles de orden 0. `engine.ts:41` ordena por orden ascendente (lo grueso primero) y `engine.ts:45` aplica el tope de 16.
- **Arreglo:**
  - Orden 0 solo a FOV grande, o solo las celdas de orden 0 que tocan la vista.
  - Cola con prioridad: primero un ancestro grueso por celda visible y luego las teselas del orden objetivo, de la más cercana al centro hacia afuera.
  - Los niveles intermedios solo si su hijo no está listo.

**M2. Cada cuadro reserva memoria y reasigna una textura (contra 06 §4: "sin reservar memoria").**

- **Medido:** 1 `texImage2D` por cuadro (182 de 182 en el arrastre; 3 017 en 2 min). `new Uint16Array(49152)` son 96 KB por cuadro, unos 5,9 MB/s de basura a 60 fps (GC 45 ms en el perfil). Además, 2 `getUniformLocation` por cuadro.
- **Dónde:** `frontend/src/engine/adapters/webgl-renderer.ts:106` (asignación), `:113` (`texImage2D` reasigna la textura `lookup` en cada cuadro) y `:114-115` (`getUniformLocation`).
- **Por qué es MAJOR:** el impacto hoy es bajo en la 780M (0,03 ms por subida). Aun así viola el presupuesto, y reasignar cada cuadro provoca bloqueos del driver en GPU integradas más débiles.
- **Arreglo:**
  - Crear `lookup` una vez con `texStorage2D(R16UI o RG16UI)` y reutilizar un solo `Uint16Array`.
  - Reconstruir y subir con `texSubImage2D` solo cuando cambie el conjunto de teselas (bandera "sucio"). La tabla no depende de la vista, así que un paneo puro no sube nada.
  - Guardar las ubicaciones de los uniformes al iniciar.

**M3. Memoria: hasta unos 512 MiB para datos que son grises de 8 bits.**

- **Medido o verificado:**
  - `texStorage3D(1, RGBA8, 512, 512, 256)` se registra al iniciar: 256 MiB de VRAM fijos aunque solo haya 12 teselas.
  - Los `ImageBitmap` siguen vivos tras subirse: llegan a 256 (unos 256 MiB decodificados).
  - Las teselas son PNG de paleta gris pura: 256 entradas, R=G=B, comprobado.
  - El arreglo de huecos se descarta al cambiar de banda: 568 subidas para 238 teselas.
- **Dónde:** `webgl-renderer.ts:83` (RGBA8 y capacidad completa), `:96` (borra huecos de teselas fuera de la banda actual) y `engine.ts:50` (guarda el bitmap).
- **Arreglo:**
  - Usar `R8` (`texSubImage3D` con `gl.RED`/`UNSIGNED_BYTE` desde el bitmap) y muestrear `.rrr` en el shader: 64 MiB, cuatro veces menos.
  - Llevar el LRU sobre los huecos de GPU y cerrar el bitmap justo después de subirlo. Si hace falta volver a subirlo, se lee de la caché HTTP.
  - No liberar huecos de otras bandas mientras no se necesiten.
  - Opcional: hacer crecer el arreglo por bloques (64, luego 128, luego 256).

**M4. URL y React se actualizan en cada evento de entrada, no por cuadro.**

- **Medido:** `history.replaceState` es el mayor consumidor de tiempo propio de JS (112 ms) y se llama 600 veces en 7 s. Cada `pointermove` también re-renderiza React (`setView` y `setCursor`) y fuerza layout (281 en 5 s).
- **Dónde:** `engine.ts:35` (`update` llama a `urlState.write` y `emit` por evento), `adapters/url-state.ts:2-5`, y `adapters/input.ts:17` (`getBoundingClientRect` en cada `pointermove`).
- **Riesgo funcional `[VERIFICAR]`:** Safari lanza `SecurityError` si `replaceState` se llama más de 100 veces en 30 s. Esa excepción saldría dentro del manejador de arrastre y congelaría el paneo. Falta probarlo en Safari.
- **Arreglo:**
  - Escribir la URL con debounce (unos 250 ms tras detenerse) y emitir `viewchange` como máximo una vez por rAF dentro de `render`.
  - Guardar el `rect` en caché con el `ResizeObserver` existente.

### MINOR

- **m1. Tarea larga de 60–132 ms en el primer cuadro.** Las comprobaciones síncronas de compilación y enlace fuerzan `Finish`: `webgl-renderer.ts:64` y `:77`. Arreglo: `KHR_parallel_shader_compile` y consultar `COMPLETION_STATUS_KHR` antes de dibujar.
- **m2. `visibleCells` corre en cada cuadro, aunque la vista no cambie.**
  - Ocurre también en cuadros que solo dispara la llegada de una tesela: 441 muestras × hasta 5 niveles, unas 2 000 cadenas u objetos por cuadro y unos 0,45 ms de CPU por cuadro (perfil).
  - Dónde: `engine.ts:38`, `:40` (`[...cache.values()].filter` por cuadro), `:41` (copia y ordena) y `:57` (`endsWith` con plantilla).
  - Arreglo: memorizar por `(ra, dec, fov, proj, tamaño)` y llevar un contador de teselas cargando.
- **m3. Las entradas `failed` nunca se desalojan ni se reintentan** (`engine.ts:54`). El mapa crece sin límite en sesiones largas con errores, y un fallo transitorio deja el hueco negro para siempre. Arreglo: tiempo de vida o reintento con espera, y contarlas en el LRU.
- **m4. `preserveDrawingBuffer: true`** (`webgl-renderer.ts:69`) obliga a copiar el buffer en cada cuadro. Solo hace falta para las capturas: hacerlo opcional.
- **m5. Búsqueda lineal de hueco** (`webgl-renderer.ts:101`) en O(capacidad) por cada tesela nueva. Arreglo: lista de huecos libres. Impacto bajo.
- **m6. Capacidades desacopladas.** Si `cacheSize` < 12, el renderer se crea con menos huecos que el LRU (`engine.ts:28` frente a `:29`). Por eso `slot >= capacity` descarta teselas en silencio (`webgl-renderer.ts:102`). Arreglo: usar la misma capacidad en los dos.
- **m7. Caché HTTP.** IRSA no envía `Cache-Control`. El proxy del backend (`/api/v1/hips`) debería servir `Cache-Control: public, max-age=31536000, immutable` para que la carga en caliente (148 ms) no dependa de la heurística.
- **m8. `perf.md` no es reproducible.** Afirma p95 de 16,70 ms en SwiftShader y 0 repetidas; aquí da 33,3 ms y 2–7 repetidas. Hay que corregirlo con el escenario exacto.

## Lo que está bien

- Bundle de 76 KB gzip, el 42 % del presupuesto.
- Fluidez sobrada en GPU integrada: GPU draw p95 0,41 ms y 60 fps incluso con la CPU ×4 más lenta.
- Cancelación real en red.
- Tope de 16 en vuelo.
- LRU que cierra bitmaps y reutiliza huecos de un solo `TEXTURE_2D_ARRAY`. No hace falta `deleteTexture` por tesela; `destroy()` libera todo en `webgl-renderer.ts:118`.
- Heap estable, sin fugas.

## Para aprobar

Resolver B1 y M1–M4, y volver a correr `r3-evidencia/measure.py angle-gl cold drag zoom abort memory` mostrando:

- 0 URL repetidas en el arrastre circular y en el zoom;
- menos del 20 % de peticiones abortadas en 2 min;
- 0 `texImage2D` durante un paneo puro.
