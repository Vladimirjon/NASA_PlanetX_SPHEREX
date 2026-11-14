# Roles, contratos y pasos — Planet X and SPHEREx (equipo Na za)

**Sábado 14 de noviembre de 2026, 09:45 (UTC−5).** Este documento manda sobre las secciones 5 y 6 de [plan_tecnico.md](plan_tecnico.md). Los cinco roles están **sin asignar**: la tabla de la sección 0 se llena en la reunión de las 10:00.

**Nombre de la app: pendiente.** En los documentos se escribe `[nombre]`. En el código hay una sola constante, `APP_NAME` en `frontend/src/config.ts`, con el valor `"Name TBD"`; cambiar el nombre es cambiar esa línea.

**Fuentes.** El objetivo del reto sale de [problema.md](problema.md); los datos medidos, de [plan_tecnico.md §1](plan_tecnico.md); el producto, de [PRODUCT.md](../PRODUCT.md); la interfaz, de [DESIGN.md](../DESIGN.md) y [ux_spec.md](ux_spec.md). De [investigacion_planet_x.md](investigacion_planet_x.md) se adoptan cinco puntos: comparar a la misma longitud de onda, restar ZODI, la semántica de `FLAGS`, la procedencia en cada fotograma y una página honesta sobre Planet X. Lo marcado **[verificar]** es una inferencia que el rol indicado confirma con datos antes de usarla.

---

## 0. Reparto (10:00–10:10)

| Rol                                      | Qué construye                                                                                                                              | Perfil que necesita                                       | Pareja de apoyo | Persona | Usuario GitHub |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------- | ------- | -------------- |
| **A. Datos y API**                 | Cliente de IRSA, caché, API FastAPI, Docker y despliegue en Hugging Face                                                                   | Python asíncrono, HTTP, Docker                           | E               |         |                |
| **B. Ciencia y validación**       | Selección por longitud de onda, movimiento propio, `FLAGS`, validación de los 5 objetos y textos científicos; aprueba toda afirmación | Física o astronomía, Python con numpy y astropy         | E               |         |                |
| **C. Motor de imagen**             | Render WebGL2 (contraste, paletas, resta), reproductor y teclado                                                                            | TypeScript, WebGL2/GLSL                                   | D               |         |                |
| **D. Aplicación web**             | App React: rutas, estado en la URL, pantallas, estados de error, Pages y CI del frontend                                                    | React, TypeScript, CSS/Tailwind, accesibilidad            | C               |         |                |
| **E. Pipeline de fotogramas y UX** | Alineación y combinación de fotogramas, galería precalculada, revisión UX, test de pasillo, pitch y video                               | Python con numpy y astropy, criterio de UX, comunicación | A y B           |         |                |

Colaboradores: `Vladimirjon`, `cschavezv03-ops`, `danielife05`, `daxrpm`, `mateobtw`.

---

## 1. Pasos comunes (todos, 10:10–10:40)

1. Acepta la invitación en [https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/invitations](https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/invitations).
2. Clona el repo:

   ```bash
   git clone https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX.git
   ```
3. Instala las herramientas de tu rol y comprueba sus versiones:

   - A, B y E: Python 3.12 y [uv](https://docs.astral.sh/uv/). Comprueba `uv --version`. Python se instala con `uv python install 3.12`.
   - C y D: Node 24 LTS y npm. Comprueba que `node -v` empieza por `v24`.
4. Lee, en este orden: [problema.md](problema.md), [PRODUCT.md](../PRODUCT.md), la sección 3 de este documento (contratos) y tu sección. Después:

   - C, D y E: [DESIGN.md](../DESIGN.md) y [maqueta.html](maqueta.html), que se abre en el navegador.
   - D y E: [ux_spec.md](ux_spec.md), secciones 1, 3, 4 y 9.
   - A, B y E: [investigacion_planet_x.md](investigacion_planet_x.md), secciones 3.1–3.4 y 4.1.
5. Crea un issue por cada paso de tu sección. El título es el ID del paso y su nombre, por ejemplo `A3 · Consulta TAP y épocas`. Asígnatelo y ponle la etiqueta de tu rol (`rol-A` … `rol-E`).
6. **Flujo de Git, sin excepciones:**

   - Una rama por issue: `feat/NN-descripcion`, `fix/NN-descripcion` o `docs/NN-descripcion`, donde `NN` es el número del issue.
   - Commits en formato Conventional Commits (`feat(api): add /api/epochs`).
   - Todo entra por PR a `main`, con CI en verde. Nunca hay push directo a `main` ni `git add .`: los archivos se añaden por nombre.
   - Fuera de los hitos, el autor integra su propio PR cuando el CI pasa. En los hitos de las **18:00** y las **02:00** otra persona revisa el PR antes de integrarlo.
   - Nunca se suben tokens ni archivos `.env`. El token de Hugging Face vive solo en la máquina de quien despliega.

### Pasos de la persona administradora del repo (cuenta `Vladimirjon`, 10:40–10:50)

1. Settings → General → Danger Zone: el repo pasa a **público**. La entrega exige enlaces abiertos y así GitHub Pages es gratis.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → Variables: crea la variable `API_BASE`. A las 17:30 se le da el valor de la URL del backend que entregue A, por ejemplo `https://<usuario>-<space>.hf.space`. No es un secreto.
4. A las 11:15, cuando existan los workflows de CI, ve a Settings → Branches → Add rule para `main`. Marca *Require a pull request before merging* sin aprobaciones obligatorias, *Require status checks to pass* con los jobs `backend` y `frontend`, y bloquea los force push.

---

## 2. Estructura del repo y dueños

```text
backend/                     Python 3.12 + uv
  pyproject.toml, uv.lock    A
  Dockerfile, README.md      A  (README.md lleva la cabecera de Hugging Face)
  app/main.py                A  FastAPI, CORS, rutas
  app/models.py              A  modelos Pydantic = contrato (sección 3)
  app/irsa.py                A  TAP, épocas, LazyImage (lectura parcial de FITS)
  app/resolve.py             A  nombre → coordenadas y movimiento propio
  app/cache.py               A  diskcache
  app/science/wavelength.py  B  longitud de onda en el objeto y selección por época
  app/science/motion.py      B  propagación de movimiento propio y paralaje
  app/science/flags.py       B  máscaras de FLAGS
  app/science/photometry.py  B  flujo de apertura (perfil D1–D6 y curva de luz)
  app/science/targets.py     B  los 5 objetos del reto y su detector por defecto
  app/frames.py              E  rejilla común, reproyección, combinación, codificación
  scripts/export_openapi.py  A  escribe contracts/openapi.json
  scripts/build_gallery.py   E  galería precalculada
  scripts/warm_cache.py      A  precalienta la caché del servidor
  tests/                     cada rol prueba sus módulos
notebooks/                   B y E (exploración; no es código del producto)
contracts/openapi.json       A lo genera; D lo consume
frontend/                    React 19 + TS + Vite
  src/config.ts              D  APP_NAME, API_BASE
  src/engine/                C  WebGL2, paletas, overlay, exportar PNG
  src/player/                C  store Zustand, bucle de reproducción, teclado
  src/data/                  D  fuentes live (API) y gallery (estática)
  src/routes/, src/components/  D
  src/content/*.md           B  textos científicos en inglés (D los muestra)
  public/gallery/            E  salida de build_gallery.py
.github/workflows/backend.yml   A
.github/workflows/frontend.yml  D
.github/workflows/pages.yml     D
docs/                        VALIDATION.md (B), EXPERIMENTS.md (A), UX_CHECKLIST.md (E)
```

Si necesitas cambiar un archivo de otro rol, avisa a su dueño en el grupo antes de abrir el PR.

---

## 3. Contratos entre roles

Ningún contrato cambia sin un mensaje en el grupo y un PR que actualice los dos lados a la vez. A escribe los modelos de esta sección en `backend/app/models.py` **antes de las 11:00**.

### 3.1 API (backend en Hugging Face, prefijo `/api`)

| Método y ruta       | Parámetros                                                                                   | Respuesta                                    | Tiempo objetivo                 |
| -------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------- |
| `GET /api/health`  | —                                                                                            | `{"status": "ok", "version": "<git sha>"}` | < 1 s                           |
| `GET /api/resolve` | `name`                                                                                      | `Resolved`                                 | < 5 s                           |
| `GET /api/epochs`  | `ra`, `dec`                                                                               | `EpochList`                                | < 10 s (sin descargar píxeles) |
| `GET /api/frame`   | `ra`, `dec`, `size_deg`, `epoch_id`, `detector`, `lambda_um`, `name` (opcional) | `Frame` o `NotComparable`                | < 60 s; si se supera, error 504 |

Reglas:

- `ra` está en grados, en el intervalo [0, 360); `dec` en grados, en [−90, 90]. `size_deg` va de 0.05 a 0.3 y vale 0.1 por defecto. `detector` es un entero de 1 a 6. `lambda_um` es opcional; si falta, se usa el centro del detector (`default_lambda`, rol B).
- **Un fotograma por petición.** El frontend pide las épocas una a una y muestra cada fotograma en cuanto llega.
- Errores con forma `{"error": "<código>", "detail": "<texto en inglés>"}`. Códigos: `bad_request` (400), `not_found` (404), `upstream_unavailable` (502, cuando IRSA o SIMBAD fallan), `timeout` (504).
- CORS permite `http://localhost:5173`, `http://localhost:4173` y `https://vladimirjon.github.io`.

```text
Resolved     = { name, ra_j2000, dec_j2000, pmra_masyr, pmdec_masyr, parallax_mas | null,
                 ref_epoch_jyear, ra_2026, dec_2026, source: "SIMBAD" | "Sesame" }
EpochList    = { ra, dec, epochs: Epoch[] }
Epoch        = { epoch_id: "YYYY-MM-DD", t_start_utc, t_end_utc, n_images,
                 n_by_detector: {"1": int, …, "6": int}, collections: string[] }
NotComparable= { status: "not_comparable", epoch_id, detector, lambda_um, reason }
Frame        = {
  status: "ok",
  frame_id,                         # sha1 corto de (ra, dec, size_deg, epoch_id, detector, lambda_um)
  epoch_id, t_mid_utc,
  detector, lambda_target_um, lambda_um, delta_lambda_um,
  collections: string[], obs_ids: string[], n_images,
  grid: { center_ra, center_dec, size_deg, width, height, pixscale_arcsec },
  data_b64,                         # float32 little-endian, fila 0 = NORTE, NaN = sin dato
  stats: { p1, p50, p99_5 },        # en MJy/sr, ignorando NaN
  flags_frac,                       # fracción de píxeles con bits PHOT_MASK_BITS
  saturated_at_target: bool,
  expected_xy: [x, y] | null,       # solo si llegó `name`; coordenadas de la sección 3.3
  simulated: bool,                  # true solo en el stub de A; la UI muestra "SIMULATED"
  provenance: { pipeline_version, git_sha, created_utc, data_release_doi }
}
```

### 3.2 Galería estática (sale de E y la lee D)

```text
frontend/public/gallery/index.json             [{slug, name, kind: "moving" | "variable", ra, dec, size_deg, detector, lambda_um}]
frontend/public/gallery/<slug>/manifest.json   {slug, name, epochs: Epoch[], frames: [frame_id…], not_comparable: NotComparable[]}
frontend/public/gallery/<slug>/<frame_id>.json Frame   (el mismo esquema que /api/frame)
```

Los *slugs* son `wise-0855`, `barnards-star`, `eps-indi-b`, `rw-aur` y `r-dra`.

### 3.3 Convención de píxeles (la escriben E y B, y la usa todo el mundo)

- Rejilla común: proyección TAN centrada en (`ra`, `dec`), norte arriba y este a la izquierda. `CDELT1 = −pix` y `CDELT2 = +pix`, con `pix = 6.15″` (escala nativa según la [documentación de IRSA](investigacion_planet_x.md); 6.2″ es el valor redondeado). El lado es `n = ceil(size_deg·3600/6.15)`; si sale par, se suma 1 para que el objeto quede en un píxel central.
- `data_b64` va fila por fila, y **la fila 0 es el norte**: E aplica `np.flipud` a la matriz de astropy antes de codificarla.
- `expected_xy` está en **coordenadas de pantalla**: origen en la esquina superior izquierda de la imagen; el píxel `i` ocupa [i, i+1), así que su centro es `i + 0.5`. Desde astropy, con `(xc, yc) = wcs.world_to_pixel(...)` en base 0: `x = xc + 0.5` y `y = height − 0.5 − yc`.
- FITS cuenta desde 1 y astropy desde 0. Cada conversión lleva una prueba (pasos B4 y E2).

### 3.4 Interfaces Python entre A, B y E

```python
# app/irsa.py (A)
@dataclass(frozen=True)
class ImageMeta:
    obs_id: str; collection: str; detector: int      # 1..6
    t_mid_mjd: float; access_url: str; s3_uri: str | None
async def find_images(ra: float, dec: float) -> list[ImageMeta]
def group_epochs(images: list[ImageMeta], gap_days: float = 20.0) -> list[EpochGroup]
class LazyImage:                                     # se abre con fsspec, sin descargar el archivo entero
    meta: ImageMeta
    def header(self, ext: str) -> fits.Header
    def celestial_wcs(self) -> WCS                   # WCS espacial de la extensión IMAGE (con SIP)
    def hdul(self) -> fits.HDUList                   # para el WCS espectral (B)
    def read_section(self, ext: str, y0: int, y1: int, x0: int, x1: int) -> np.ndarray
async def open_image(meta: ImageMeta) -> LazyImage

# app/science/wavelength.py (B)
def wavelength_at(img: LazyImage, ra: float, dec: float) -> tuple[float, float] | None   # (λ µm, ancho µm)
def tolerance_um(detector: int, lambda_um: float) -> float
def select_for_epoch(cands: list[tuple[LazyImage, float]], lambda_um: float, detector: int,
                     max_n: int = 3) -> list[LazyImage]
def default_lambda(detector: int) -> float
# app/science/motion.py (B)
def propagate(ra, dec, pmra_masyr, pmdec_masyr, parallax_mas, ref_epoch_jyear, t: Time) -> tuple[float, float]
# app/science/flags.py (B)
def display_mask(flags: np.ndarray) -> np.ndarray      # True = poner NaN
def flags_fraction(flags: np.ndarray) -> float
def saturated_at(flags: np.ndarray, x: int, y: int, r: int = 1) -> bool

# app/frames.py (E)
def common_grid(ra: float, dec: float, size_deg: float) -> tuple[WCS, tuple[int, int]]
def build_frame(images: list[LazyImage], ra: float, dec: float, size_deg: float,
                epoch_id: str, detector: int, lambda_target_um: float, lambdas_um: list[float],
                expected_radec: tuple[float, float] | None) -> Frame
```

### 3.5 Interfaz TypeScript entre C y D

```ts
// frontend/src/engine/index.ts (C)
export type EngineFrame = { id: string; width: number; height: number; data: Float32Array };
export type Mode = 'blink' | 'diff' | 'neg';
export type Colormap = 'gray' | 'inferno' | 'diverging';
export interface Renderer {
  setFrames(frames: EngineFrame[]): void;
  draw(opts: { index: number; refIndex: number; mode: Mode; lo: number; hi: number;
               stretch: 'asinh' | 'linear'; colormap: Colormap; zoom: number; panX: number; panY: number;
               markers: { x: number; y: number; label: string }[] }): void;
  imageToScreen(x: number, y: number): { x: number; y: number };
  exportPNG(caption: string): Promise<Blob>;
  dispose(): void;
}
export function createRenderer(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement): Renderer;
export function decodeFrame(b64: string, width: number, height: number): Float32Array;
// frontend/src/player/store.ts (C): usePlayer = create<{ index, playing, fps: 0.5|1|2|3, mode, refIndex,
//   lo, hi, stretch, colormap, zoom, panX, panY, setFrameCount, play, pause, next, prev, seek, ... }>()
```

---

## 4. Horario e hitos

| Hora                  | Hito                                                                        | Criterio de «hecho»                                                                                                                                                                                                                               | Quién                      |
| --------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 10:00                 | Reparto                                                                     | Tabla de la sección 0 llena                                                                                                                                                                                                                        | Todos                       |
| 10:40                 | Repo configurado                                                            | Público y Pages con Actions                                                                                                                                                                                                                        | Admin                       |
| **11:00**       | **H0 · Esqueletos**                                                  | `backend/` y `frontend/` en `main` con CI en verde; `models.py` y `contracts/openapi.json` integrados; el stub `/api/frame` devuelve fotogramas `simulated: true`                                                                     | A, D                        |
| **13:00**       | **H1 · Piezas sueltas**                                              | A: `/api/epochs` real para WISE 0855 en local. B: `wavelength_at` y `propagate` con pruebas. C: blink de 5 fotogramas simulados. D: rutas, búsqueda y cliente de la API contra el stub. E: un fotograma alineado de WISE 0855 en un notebook | Cada uno                    |
| 15:30                 | H1.5 · Fotograma real                                                      | `/api/frame` real devuelve WISE 0855 en local; `build_gallery.py --only wise-0855` funciona                                                                                                                                                     | A, B, E                     |
| **18:00**       | **H2 · Mínimo de punta a punta desplegado** (revisión obligatoria) | En la URL pública de Pages, escribir `WISE 0855` muestra sus épocas reales en blink; la galería de WISE 0855 funciona sin backend                                                                                                              | Todos                       |
| 19:00                 | Test de pasillo                                                             | 5 personas ajenas al equipo, protocolo de ux_spec §10                                                                                                                                                                                              | E                           |
| 20:00                 | Pitch v1                                                                    | Guion leído en voz alta en menos de 5 min                                                                                                                                                                                                          | B, E                        |
| 23:00                 | SHOULD terminados                                                           | Diferencia, cruz prevista, metadatos, galería de los 5 objetos, página Planet X                                                                                                                                                                   | Todos                       |
| **02:00 (dom)** | **Congelación** (revisión obligatoria)                              | Solo se corrigen errores; tag `v0.9`                                                                                                                                                                                                              | Todos                       |
| 07:30–10:00          | Integración final                                                          | Capturas reales, video de respaldo, README, dos ensayos cronometrados, tag `v1.0`                                                                                                                                                                 | Todos                       |
| 10:30–11:00          | Entrega local                                                               | Enlaces abren sin pedir permisos                                                                                                                                                                                                                    | E y B                       |
| ≤ 23:59              | Entrega global                                                              | Formulario de la pestaña Project enviado                                                                                                                                                                                                           | Team Owner en la plataforma |

Fuente de las horas de entrega: [reglas_evento.md](reglas_evento.md).

---

## 5. Rol A — Datos y API

**Objetivo:** que `/api/epochs` y `/api/frame` devuelvan datos reales de IRSA, rápido y con caché, desde Hugging Face Spaces.

**A1 · Esqueleto del backend (10:40–11:00)**

```bash
mkdir backend && cd backend
uv init --app --python 3.12 --vcs none --name spherex-api .
uv add fastapi "uvicorn[standard]" pydantic httpx astropy astroquery pyvo reproject numpy fsspec aiohttp s3fs diskcache orjson
uv add --dev pytest pytest-asyncio ruff mypy
```

- `app/main.py`: crea la app FastAPI, aplica el CORS de §3.1 y añade `GET /api/health`, que devuelve `{"status": "ok", "version": os.environ.get("GIT_SHA", "dev")}`.
- `tests/test_health.py`: prueba esa ruta con `fastapi.testclient.TestClient`.
- `.github/workflows/backend.yml`: job `backend` con `astral-sh/setup-uv`. Ejecuta `uv sync --locked`, `uv run ruff check .` y `uv run pytest -m "not network"`, con `working-directory: backend`.
- Comprueba en local: `uv run uvicorn app.main:app --reload --port 8000` y abre `http://localhost:8000/api/health`.
- PR `feat(backend): skeleton`, con `uv.lock` incluido.

**A2 · Contrato y stub (11:00–11:30)**

- Escribe en `app/models.py` todos los modelos de §3.1 con Pydantic v2.
- Crea `scripts/export_openapi.py`, que escribe `app.openapi()` en `../contracts/openapi.json`, y ejecútalo: `uv run python scripts/export_openapi.py`.
- Stub de `/api/epochs`: devuelve 4 épocas falsas. Stub de `/api/frame`: devuelve una matriz de 59×59 con ruido gaussiano, tres estrellas fijas y una que se mueve 0.5 px por época, siempre con `simulated: true`.
- Avisa a D en el grupo: «contrato listo». Con eso, D y C trabajan sin esperar a IRSA.

**A3 · Consulta TAP y épocas (11:30–13:00)**

1. Comprueba primero los nombres reales de las columnas:

   ```python
   from astroquery.ipac.irsa import Irsa
   Irsa.query_tap("SELECT TOP 5 * FROM spherex.obscore WHERE obs_collection = 'spherex_qr3'").to_table()
   ```

   Anota en `docs/EXPERIMENTS.md` las columnas de identificador, colección, URL de acceso, URI de S3 (`cloud_access` u otra), tiempos, longitud de onda y región.
2. Consulta de producción (ajusta los nombres según lo anotado):

   ```sql
   SELECT obs_id, obs_collection, access_url, t_min, t_max, s_region
   FROM spherex.obscore
   WHERE obs_collection IN ('spherex_dr1','spherex_qr3','spherex_dr1_deep','spherex_qr3_deep')
     AND CONTAINS(POINT('ICRS', {ra}, {dec}), s_region) = 1
   ```
3. `find_images`:

   - ejecuta la consulta con `asyncio.to_thread`;
   - toma el detector de la cadena `D(\d)` del identificador o del nombre de archivo;
   - calcula `t_mid_mjd = (t_min + t_max) / 2`;
   - elimina duplicados por `obs_id`, prefiriendo `dr1` a `qr3`.
4. `group_epochs`: ordena por tiempo y abre una época nueva cuando el salto supera `gap_days` (20 por defecto; B confirma el valor en B6). El `epoch_id` es la fecha UTC de la primera imagen de la época.
5. Caché: guarda el resultado de TAP 24 h en `diskcache`, con la clave `(round(ra, 4), round(dec, 4))`. El directorio es la variable `CACHE_DIR`, que vale `/tmp/cache` por defecto.
6. `GET /api/epochs` real. La prueba `tests/test_irsa.py`, marcada con `@pytest.mark.network`, usa WISE 0855 (RA 133.7951°, Dec −7.2451°). Debe devolver unas 258 imágenes en 4 ventanas, como en plan_tecnico §1.
7. **H1:** pega el JSON de la respuesta de WISE 0855 en el PR.

**A4 · Lectura parcial de FITS y experimento de coste (13:00–14:30)**

- `open_image` usa `fits.open(uri, use_fsspec=True, lazy_load_hdus=True)`. Para S3 añade `fsspec_kwargs={"anon": True}`; para HTTPS, `fsspec_kwargs={"block_size": 65536}`.
- `read_section` usa `hdul[ext].section[y0:y1, x0:x1]`.
- Concurrencia: como máximo **6** aperturas a la vez con `asyncio.Semaphore(6)`. Reintenta 2 veces con espera exponencial (1 s y luego 3 s).
- Experimento E2: para 10 imágenes de WISE 0855, mide tiempo y bytes de tres vías y anota la mediana y el p95 en `docs/EXPERIMENTS.md`:

  - (a) servicio de recorte `access_url?center=RA,DEC&size=0.1`;
  - (b) fsspec por HTTPS;
  - (c) fsspec por S3.

  La vía por defecto es la de menor p95. La vía (a) queda como respaldo si las otras fallan.

**A5 · Resolución de nombres (14:30–15:00)**

- `GET /api/resolve` con `astroquery.simbad.Simbad`. Añade los campos de movimiento propio y paralaje con `Simbad.add_votable_fields(...)` y comprueba los nombres exactos de las columnas con `Barnard's Star`.
- Si SIMBAD falla, usa Sesame (`https://cds.unistra.fr/cgi-bin/nph-sesame/-oI/A?<nombre>`).
- `ra_2026`/`dec_2026` = `propagate(..., Time(2026.0, format="jyear"))` de B. Mientras B no lo integre, devuelve la posición J2000.
- Caché sin caducidad, con el nombre en minúsculas como clave.

**A6 · `/api/frame` real (15:00–16:30)**

Orden fijo de la ruta:

1. `find_images`, filtrar por `epoch_id` y `detector`, y abrir las candidatas con `open_image` en paralelo.
2. Para cada candidata, `wavelength_at` de B; descarta las que devuelven `None`.
3. `select_for_epoch` de B. Si devuelve una lista vacía, responde `NotComparable` con el motivo `"no image within ±{tol:.3f} µm of {λ} µm in this epoch"`.
4. Si llegó `name`, `resolve` y `propagate` al `t_mid` de la época.
5. `build_frame` de E.
6. Guarda el `Frame` completo en `diskcache` sin caducidad, con la clave `frame_id`.

Todo con `asyncio.wait_for(..., 55)`; si se supera, responde 504 `timeout`. Prueba con red: el `Frame` de WISE 0855 en D6 tiene `simulated == false` y `n_images >= 1`.

**A7 · Docker y Hugging Face Spaces (16:30–17:30)**

- `backend/Dockerfile`:

  ```dockerfile
  FROM python:3.12-slim
  COPY --from=ghcr.io/astral-sh/uv:<versión exacta de `uv --version`> /uv /bin/uv
  WORKDIR /app
  COPY pyproject.toml uv.lock ./
  RUN uv sync --locked --no-dev
  COPY app ./app
  ENV CACHE_DIR=/tmp/cache
  EXPOSE 7860
  CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
  ```
- `backend/README.md` empieza con esta cabecera, que pide Hugging Face:

  ```yaml
  ---
  title: SPHEREx blink API
  sdk: docker
  app_port: 7860
  ---
  ```
- Prueba local: `docker build -t spherex-api backend` y `docker run -p 7860:7860 spherex-api`.
- En [https://huggingface.co/new-space](https://huggingface.co/new-space): SDK **Docker**, hardware **CPU basic · free**, visibilidad pública.

  - **Costo:** gratis. Elegir cualquier otro hardware o almacenamiento persistente se cobra; no lo actives.
  - El Space se duerme tras un tiempo sin uso.
- Token: créalo tú en [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) con permiso *write* e inicia sesión en tu máquina con `hf auth login`. **No se comparte ni se sube al repo.**
- Despliegue:

  ```bash
  hf upload <usuario>/<space> backend . --repo-type space
  ```
- Comprueba `https://<usuario>-<space>.hf.space/api/health` y pasa esa URL a la persona administradora (variable `API_BASE`) y a D.

**A8 · Integración (17:30–18:00)** Con D: la URL pública de Pages pide al backend desplegado. Revisa los errores en los registros del Space (pestaña *Logs*).

**A9 · Rendimiento (18:00–23:00)** Crea `scripts/warm_cache.py`, que pide al servidor desplegado todos los fotogramas de los 5 objetos con su detector por defecto (`targets.py`). Ejecútalo después de cada despliegue y el domingo a las 07:30. Mide el tiempo de primera respuesta y el de caché, y anótalos en `docs/EXPERIMENTS.md`.

**A10 · Solo si a las 23:00 todo lo SHOULD está hecho:** marca los asteroides conocidos del campo con el servicio `sb_ident` de JPL, usando como observador la posición de SPHEREx (Horizons `-163182`), no el centro de la Tierra. Receta en [investigacion_planet_x.md §3.5 y §4.2](investigacion_planet_x.md).

**Domingo:** a las 07:30 despierta el Space y ejecuta `warm_cache.py`; a las 09:00 escribe la sección «Backend» del README (cómo correrlo y qué servicios de IRSA usa).

---

## 6. Rol B — Ciencia y validación

**Objetivo:** que cada fotograma sea comparable y correcto, y que nada de lo que diga la web o el pitch sea falso. **B es la única persona que aprueba afirmaciones científicas.**

**B1 · Reconocimiento de los datos (10:40–11:45, notebook `notebooks/b1_wise0855.ipynb`)**

Abre una imagen de WISE 0855 siguiendo el [tutorial de introducción de IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/) y anota en `docs/VALIDATION.md` lo que encuentres:

1. **Longitud de onda por píxel.** Comprueba cómo lo hace el tutorial: WCS espectral con clave alternativa `W`, del tipo `WCS(hdul["IMAGE"].header, fobj=hdul, key="W")` y luego `pixel_to_world(x, y)`, que devuelve λ y ancho de banda. **[verificar]**
2. **Bits de `FLAGS`.** Léelos de la cabecera de la extensión `FLAGS` y compáralos con la lista de [investigacion_planet_x.md §3.3](investigacion_planet_x.md).
3. **Unidades y fondo.** Confirma que `IMAGE` está en MJy/sr y que `ZODI` está en las mismas unidades.

**B2 · `wavelength.py` (11:45–13:00)**

- Constantes: `R = {1: 39, 2: 41, 3: 41, 4: 35, 5: 112, 6: 128}`. Rangos en µm: D1 0.75–1.09, D2 1.10–1.62, D3 1.63–2.41, D4 2.42–3.82, D5 3.83–4.41, D6 4.42–5.00 ([fuente](investigacion_planet_x.md)).
- `default_lambda(d)` devuelve el punto medio del rango.
- `tolerance_um(d, λ) = λ / R[d]`, es decir, un canal espectral. Con medio canal casi nunca habría más de una imagen por época.
- `wavelength_at` devuelve `None` si el objeto cae fuera del detector.
- `select_for_epoch` se queda con las candidatas tales que `|λ − λ_objetivo| ≤ tolerancia` y devuelve como máximo las 3 más cercanas.
- Pruebas en `tests/test_wavelength.py`:
  - elige la más cercana;
  - devuelve `[]` cuando ninguna está dentro de la tolerancia;
  - **regresión:** dos imágenes del mismo campo a λ distintas fuera de la tolerancia nunca se combinan.

**B3 · `motion.py` (13:00–14:00)**

- `propagate`:
  1. `SkyCoord(ra, dec, pm_ra_cosdec=pmra, pm_dec=pmdec, distance=Distance(parallax=plx·mas), radial_velocity=0·km/s, obstime=Time(ref_epoch, format="jyear")).apply_space_motion(new_obstime=t)`.
  2. Paralaje: al vector baricéntrico de la estrella (en au) réstale el de la Tierra, `get_body_barycentric("earth", t)`. Convierte el resultado a (ra, dec).
  3. Si `parallax_mas` es `None`, omite el paso 2.
- SIMBAD da `pmra` ya multiplicado por cos δ.
- Pruebas:
  - Barnard propagada a `2025.6` queda a 4.4′ ± 0.2′ de su posición J2000 (10.4″/año × 25.6 años; plan_tecnico §1);
  - con movimiento propio cero y sin paralaje, la posición no cambia.

**B4 · `flags.py` (14:00–14:30)**

```python
DISPLAY_MASK_BITS = (6, 9, 10, 11)                          # NONFUNC, MISSING_DATA, HOT, COLD → NaN
PHOT_MASK_BITS    = (2, 6, 9, 10, 11, 15, 17, 26, 27, 28, 29)  # conjunto que ignora la fotometría de IRSA
SATURATION_BITS   = (1, 15)                                 # OVERFLOW, NONLINEAR → saturated_at_target
NEVER_MASK        = (19, 21)                                # OUTLIER, SOURCE: un objeto que se mueve ES un outlier
```

- Ajusta los números a lo que confirmaste en B1.
- `NONLINEAR` **no** se enmascara al mostrar la imagen: Barnard es muy brillante y quedaría un agujero justo en el objeto. Se informa con `saturated_at_target`.
- Pruebas con matrices pequeñas hechas a mano. Incluye la prueba de convención de píxeles: un píxel con un bit encendido en `(x, y)` de astropy aparece en la fila `height − 1 − y` tras `flipud`.

**B5 · `targets.py` (14:30–15:00)** Los 5 objetos con `slug`, `name` (identificador de SIMBAD), `kind` (`moving` o `variable`), `detector`, `lambda_um` y `size_deg = 0.1`. Propuesta inicial, que B cambia según los datos:

| Objeto         | Detector |
| -------------- | -------- |
| WISE 0855      | D6       |
| Epsilon Indi B | D5       |
| Barnard        | D3       |
| RW Aur         | D4       |
| R Dra          | D4       |

La propuesta de WISE 0855 viene de plan_tecnico §1: es una enana Y fría, brillante cerca de 4.5 µm **[verificar]**.

**B6 · Tabla de validación (15:30–18:00, completar hasta las 23:00)** En `docs/VALIDATION.md`, una fila por objeto con estas columnas:

- detector y λ;
- épocas comparables / épocas totales;
- desplazamiento medido entre la primera y la última época (centroide ponderado por flujo en una caja de 5×5 px) frente al previsto por `propagate`;
- saturación;
- visible: sí o no.

Confirma también el `gap_days` de A3.

**Criterio:** para Barnard y WISE 0855, |medido − previsto| < 0.5 px, o la explicación de por qué no se cumple.

**B7 · `photometry.py` (18:00–20:00, SHOULD)** Flujo de apertura en el fotograma combinado:

- suma en un radio de 2 px menos la mediana de un anillo de 4–7 px multiplicada por el número de píxeles;
- conversión: `× Ω_pix` con `Ω_pix = (6.15/206265)² sr`, y el resultado de MJy a mJy.

Sirve para la curva de luz de RW Aur y R Dra y para el perfil D1–D6. En la UI se rotula «Illustrative» hasta que B valide los números.

**B8 · Textos en inglés en `frontend/src/content/` (20:00–23:00)**

- `objects/<slug>.md`: «What am I seeing?», 60 palabras como máximo por objeto.
- `about.md`: qué es SPHEREx, qué es un blink, por qué importa la longitud de onda y créditos (texto de reconocimiento de IRSA y DOI de DR1/QR3 copiados de la [página de la misión](https://irsa.ipac.caltech.edu/Missions/spherex.html)).
- `planet-x.md`: «Could SPHEREx see Planet X?». Usa las cifras de [investigacion_planet_x.md §4.1](investigacion_planet_x.md), cada una con su cita:

  - profundidad de una visita, AB ≈ 18.5–19 por debajo de 3.8 µm (predicción previa al lanzamiento);
  - Planet Nine con V > 21 probable;
  - límite de WISE W1 > 16.7.

  Conclusión obligatoria: **«SPHEREx is very unlikely to detect a Planet Nine; this tool shows how the blink method works on known objects.»** Antes de publicar, comprueba cada cifra en el artículo original.

**B9 · Puerta de afirmaciones (todo el evento)** Revisa todo PR que toque `src/content/`, leyendas o el pitch. Se rechaza cualquier frase con «detect», «discover» o «found» aplicada a nuestro trabajo. Las fórmulas permitidas son «shows the expected motion» y «the observed shift matches the prediction».

**B10 · Pitch y entrega** A las 20:00, guion científico del pitch con E. El domingo a las 09:00, la tabla de validación final en el README. Si eres Team Owner en la plataforma, envías el formulario global.

---

## 7. Rol C — Motor de imagen

**Objetivo:** dibujar fotogramas float32 sin suavizado, con contraste y paleta ajustables, y reproducirlos como blink a 3 fps como máximo.

**C1 · Datos simulados (10:40–11:15)** Mientras D monta el esqueleto, escribe `frontend/src/engine/synthetic.ts`:

- 5 fotogramas de 59×59 con ruido gaussiano, 3 estrellas fijas y una que se mueve 0.4 px por fotograma;
- unos cuantos `NaN` en una esquina;
- todo marcado `simulated`.

Si a las 11:00 no existe aún `frontend/`, trabaja en una rama a partir de la de D.

**C2 · Renderer WebGL2 (11:15–13:00)** `createRenderer` (§3.5):

- **Textura:** `R32F`, una por fotograma, con filtro `NEAREST` (sin suavizado; además, así no hace falta `OES_texture_float_linear`).
- **Fragment shader:**
  - `isnan(v)` pinta el color Night `#07080B`;
  - `asinh`: `t = asinh(10·(v − lo)/(hi − lo)) / asinh(10)`, recortado a [0, 1];
  - `linear`: `t = (v − lo)/(hi − lo)`;
  - `neg`: `t = 1 − t`;
  - `diff`: `v = frame[index] − frame[refIndex]`, mapeado de forma simétrica en ±`(hi − lo)·0.2`.
- **Paletas:** texturas LUT de 256×1:
  - `gray`;
  - `inferno`;
  - `diverging`, azul-blanco-naranja, legible con daltonismo (DESIGN.md exige paletas perceptualmente uniformes).
- **Zoom:** entero (1–16), centrado, con desplazamiento.
- **Marcadores:** en el canvas `overlay` (2D), círculo cian `#5CE1E6` de trazo 1.5 px con el número de época encima, en `imageToScreen(x, y)`. El cian se usa solo para esto (DESIGN.md).
- **Prueba de H1:** ruta de desarrollo `/dev/engine`, que solo existe con `import.meta.env.DEV`, haciendo blink de los fotogramas simulados.

**C3 · Reproductor (13:00–14:30)** En `player/store.ts`, Zustand (§3.5):

- el bucle usa `requestAnimationFrame` y avanza cada `1000/fps` ms, con `fps ∈ {0.5, 1, 2, 3}`; **nunca más de 3 fps** (WCAG 2.3.1);
- si `matchMedia("(prefers-reduced-motion: reduce)")` se cumple, no hay autoplay y D ofrece el modo lado a lado.

Teclado en `player/useKeyboard.ts`, según [ux_spec §7.1](ux_spec.md). C hace las teclas del reproductor:

| Tecla                         | Acción                                     |
| ----------------------------- | ------------------------------------------- |
| Espacio                       | Play/pausa                                  |
| ← / →                       | Fotograma anterior / siguiente              |
| Home / End                    | Primer / último fotograma                  |
| `[` / `]`                 | Más lento / más rápido                   |
| B                             | Modo blink                                  |
| D                             | Modo diferencia                             |
| N                             | Negativo                                    |
| `+` o `=` / `-` / `0` | Zoom más / zoom menos / ajustar a la vista |
| P                             | Mostrar u ocultar la posición prevista     |

D hace las de la app: `1`–`6` (detector), F, M, S, `Ctrl+K`, Escape y `?`. Ninguna tecla actúa cuando el foco está en un `input`.

**C4 · Decodificación y contraste común (14:30–15:30)**

- `decodeFrame`: base64 → `Uint8Array` → `new Float32Array(buf.buffer)`. Comprueba que `byteLength === width·height·4`; si no, lanza un error.
- Contraste común a toda la secuencia, para que el brillo no parpadee: `lo = min(p1)` y `hi = max(p99_5)` de los fotogramas cargados. El usuario lo ajusta con un deslizador.
- Pruebas con Vitest:
  - decodificación de ida y vuelta;
  - fórmula asinh en 0, 0.5 y 1;
  - el fps se limita a 3;
  - el NaN se mapea al color de máscara.

**C5 · Fotogramas reales (15:30–18:00)** Integra con D los fotogramas del stub y luego los reales. Comprueba con WISE 0855 que la fila 0 es el norte, comparando con la vista de Aladin o el notebook de E.

**C6 · SHOULD (18:00–23:00)**

- Modo diferencia con la época 1 como referencia (S1).
- Marcadores de `expected_xy` (S2).
- `exportPNG`: dibuja el fotograma actual con una franja inferior que lleva la fecha, λ, el detector, RA/Dec y «SPHEREx / IRSA» (S5).

**C7 · COULD:** compuesto D1–D6 en falso color (C3 de ux_spec) solo si B confirma qué se puede mostrar y está rotulado.

**Domingo:** prueba el rendimiento en el portátil del proyector, con zoom 8× y los 5 objetos, y corrige errores.

---

## 8. Rol D — Aplicación web

**Objetivo:** la app pública en GitHub Pages, con estado en la URL, que funciona con el backend y sin él (galería).

**D1 · Esqueleto (10:40–11:15)**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm config set save-exact true --location=project
npm install @tanstack/react-router @tanstack/react-query zustand radix-ui lucide-react @observablehq/plot @fontsource/barlow @fontsource/barlow-semi-condensed @fontsource/jetbrains-mono
npm install -D tailwindcss @tailwindcss/vite openapi-typescript vitest jsdom @testing-library/react @playwright/test
```

- `vite.config.ts`: `base: "/NASA_PlanetX_SPHEREX/"` y los plugins `react()` y `tailwindcss()`.
- `src/config.ts`: `export const APP_NAME = "Name TBD"` y `export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000"`.
- `src/styles/tokens.css`: `@import "tailwindcss";` y un bloque `@theme` que copia **exactamente** los colores, tipografías, radios y espacios de la cabecera YAML de [DESIGN.md](../DESIGN.md) (por ejemplo, `--color-night: #07080B`). Las fuentes se cargan desde `@fontsource`, así funcionan sin internet en el coliseo.
- **Workflow `frontend.yml`:** job `frontend` con `npm ci`, `npm run lint`, `npx vitest run` y `npm run build`, con `working-directory: frontend`.
- **Workflow `pages.yml`:** se ejecuta con cada push a `main`. Hace el build con `VITE_API_BASE: ${{ vars.API_BASE }}`, sube `frontend/dist` con `actions/upload-pages-artifact` y despliega con `actions/deploy-pages`.
- Prueba local: `npm run dev` abre `http://localhost:5173/NASA_PlanetX_SPHEREX/`.

**D2 · Tipos y fuentes de datos (11:15–12:00)**

- Tipos: `npx openapi-typescript ../contracts/openapi.json -o src/api/schema.d.ts`. Añádelo como script `npm run gen:api`.
- `src/data/live.ts`: funciones `resolve`, `epochs` y `frame` sobre `fetch(API_BASE + "/api/…")`.
- `src/data/gallery.ts`: las mismas funciones sobre `import.meta.env.BASE_URL + "gallery/…"`.
- Ambas devuelven los mismos tipos.

**D3 · Rutas y estado en la URL (12:00–13:00)** TanStack Router con **`createHashHistory`**: GitHub Pages no sirve rutas profundas, y con *hash* cualquier enlace compartido funciona.

| Ruta                                                                              | Pantalla    |
| --------------------------------------------------------------------------------- | ----------- |
| `#/`                                                                            | Sky         |
| `#/investigate?ra=&dec=&size=&det=&lambda=&frame=&mode=&src=live\|gallery&name=` | Investigate |
| `#/gallery`                                                                     | Gallery     |
| `#/about`                                                                       | About       |
| `#/planet-x`                                                                    | Planet X    |

Valida los parámetros de búsqueda con `validateSearch`: `ra` en [0, 360), `dec` en [−90, 90], `size` en [0.05, 0.3] y 0.1 por defecto, `det` de 1 a 6.

**D4 · Búsqueda de coordenadas (13:00–14:00)** `src/lib/parseCoords.ts` es una función pura que acepta:

- decimal: `133.7951 -7.2451`;
- sexagesimal con letras: `08h55m10.83s -07d14m42.5s`;
- sexagesimal con espacios o dos puntos: `08 55 10.83 -07 14 42.5`.

Si no es una coordenada, el texto se trata como nombre y pasa por `/api/resolve`, que navega a `ra_2026`/`dec_2026` con `name`. Debajo del campo va la validación en vivo con un ejemplo. Pruebas con Vitest de los tres formatos y de dos entradas inválidas.

**D5 · Investigate (14:00–18:00)** Layout de [DESIGN.md](../DESIGN.md) (Layout) y [ux_spec §3.2](ux_spec.md):

- **Escenario:** `<canvas>` de C más el canvas `overlay`, ocupando ~65 % del ancho.
- **Panel lateral de 352 px:** tabla de épocas (# en cian, fecha, λ, estado), chips D1–D6, metadatos del fotograma.
- **Barra de transporte:** Play de 48 px, anterior/siguiente, deslizador, velocidad 0.5/1/2/3 y modos con su atajo visible.
- **Identidad del fotograma:** fecha · λ · detector · colección, en la esquina inferior izquierda.
- **Peticiones:** con TanStack Query, una consulta por época, con clave `["frame", params, epoch_id]`, `staleTime: Infinity` y `retry: 1`. Cada fotograma se dibuja al llegar.
- **Progreso:** barra segmentada (M8): hecho en el color del detector, descargando con pulso, fallido en rojo con reintento individual.
- **Estados especiales:**
  - un `NotComparable` aparece en la tabla con su motivo, nunca se oculta;
  - si `simulated` es `true`, se muestra la etiqueta «SIMULATED».

**D6 · Despliegue de H2 (17:00–18:00)** Con A: `API_BASE` configurada y Pages desplegado. Comprueba en la URL pública:

1. `WISE 0855` hace blink con datos reales.
2. Con la red del backend cortada, `#/gallery` sigue funcionando.

**D7 · Errores y modo sin conexión (18:00–20:00)**

- **Servidor dormido:** la primera llamada a `/api/health` muestra «Waking up the data server (up to a minute)».
- **Error de red:** pantalla de DESIGN.md con el título «Couldn't reach the data server», la acción principal «Load precomputed data» (lleva a la galería del objeto si existe) y la secundaria «Retry connection».
- **Respaldo del proyector:** sin Service Worker. El portátil de la demo corre el build local:

  ```bash
  npm run build && npx vite preview --port 4173
  ```

  Así la galería se sirve desde el disco.

**D8 · SHOULD (18:00–23:00)**

- Sky con Aladin Lite v3 a pantalla completa (S0): `npm install aladin-lite`, con la versión que quede fijada, y el HiPS `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube`. Si falla, un fondo fijo.
- Las 5 tarjetas de objetos.
- Botón «Copy link» (S5).
- Páginas About y Planet X, que muestran los `.md` de B importados con `?raw`.
- Créditos de SPHEREx/IRSA/DOI en el pie de página (M13).

**D9 · Calidad (23:00–02:00)**

- Prueba de humo con Playwright (`tests/smoke.spec.ts`): para cada uno de los 5 *slugs*, `#/investigate?src=gallery&…` muestra al menos 2 fotogramas.
- Repaso de accesibilidad: foco visible en Warm Gold, `aria-label` en los botones de icono, nada por debajo de 12 px y contraste AA.

**Domingo:** a las 09:30, tag `v1.0` y release con el enlace de Pages.

---

## 9. Rol E — Pipeline de fotogramas y UX

**Objetivo:** convertir las imágenes seleccionadas en un fotograma alineado y honesto, generar la galería de respaldo y garantizar que un recién llegado entienda lo que ve en menos de un minuto.

**E1 · Prueba en notebook (10:40–12:00, `notebooks/e1_align.ipynb`)** Toma 2 imágenes de WISE 0855 en D6, de épocas distintas:

1. Lee una sección de `IMAGE`, `ZODI` y `FLAGS` alrededor del objeto.
2. Calcula `IMAGE − ZODI` y pon `NaN` donde lo marque la máscara de visualización de B.
3. Reproyecta con `reproject_interp` a la rejilla de §3.3.
4. Haz el blink con matplotlib, sin suavizado (`interpolation="nearest"`).

**H1:** captura del blink en el PR.

**E2 · `frames.py` (12:00–15:30)**

- **`common_grid`**: según §3.3.
- **Lectura alineada**, por imagen:
  1. Píxel del objeto con `celestial_wcs().world_to_pixel`.
  2. Caja de `n//2 + 8` px de margen; sus bordes se recortan al detector de 2040×2040.
  3. `read_section` de `IMAGE`, `ZODI` y `FLAGS`.
  4. WCS de la sección: `wcs[y0:y1, x0:x1]` (astropy ajusta `CRPIX` y conserva SIP).
  5. `data = IMAGE − ZODI`, con `NaN` donde `display_mask` sea verdadero.
  6. `reproject_interp((data, wcs_sec), grid_wcs, shape_out, order="bilinear")`.
  7. `FLAGS` se reproyecta con `order="nearest-neighbor"`.
- **Combinación por época:** `np.nanmedian` del montón de imágenes, en `float32`.
- **Salida:**
  - `np.flipud` y luego `base64.b64encode(a.astype("<f4").tobytes())`;
  - `stats` con `np.nanpercentile`;
  - `flags_frac` y `saturated_at_target` con las funciones de B;
  - `expected_xy` según §3.3;
  - `provenance` con `git_sha` (`git rev-parse --short HEAD`) y la fecha UTC.
- **Pruebas** en `tests/test_frames.py`:
  - la fila 0 tiene mayor declinación que la última;
  - el centro de la rejilla cae en el píxel central;
  - una fuente sintética colocada en (ra, dec) conocidos sale en `expected_xy` con un error menor de 0.1 px;
  - la sección de WCS da las mismas coordenadas de cielo que el WCS completo con el desplazamiento aplicado.

**E3 · Galería (15:30–18:00 para WISE 0855; 23:00 para los 5)**

```bash
uv run python scripts/build_gallery.py --out ../frontend/public/gallery            # los 5 objetos
uv run python scripts/build_gallery.py --out ../frontend/public/gallery --only wise-0855
```

- Usa `targets.py` de B y las mismas funciones que la API, llamadas directamente y no por HTTP.
- Escribe la estructura de §3.2.
- Se niega a ejecutarse si `git status --porcelain` no está vacío, salvo con `--allow-dirty` en pruebas.
- Comprueba el tamaño total: menos de 10 MB.

**E4 · UX (en paralelo, todo el sábado)**

- **11:00:** `docs/UX_CHECKLIST.md`, con una lista de comprobación por pantalla a partir de [ux_spec §4](ux_spec.md) (estados) y de DESIGN.md (Do's and Don'ts).
- **En cada PR de C o D:** comenta lo que no cumple. No bloquea salvo en los hitos.
- **Nombre:** propón al grupo 3 nombres a las 13:00. Se decide antes de las 20:00 y D cambia `APP_NAME`.

**E5 · Test de pasillo (19:00)** Protocolo de [ux_spec §10](ux_spec.md), con 5 personas ajenas al equipo y en la URL pública. Anota los resultados en `docs/UX_CHECKLIST.md` y aplica esa noche la tabla «Qué hacer con los resultados».

**E6 · Pitch (20:00 y domingo)**

- **Diapositivas:** como máximo 5 minutos; el formato global se confirma en [reglas_evento.md](reglas_evento.md). Orden: problema → demo en vivo de WISE 0855 → por qué importa la longitud de onda → validación (tabla de B) → límites honestos (Planet X).
- **Domingo 07:30:** captura y graba un video de respaldo de la demo con datos reales.
- **10:30:** entrega local con B.

**E7 · README (domingo, 08:00–09:30)**

- qué es y enlace;
- cómo usarla;
- datos y créditos: SPHEREx, IRSA, DOI y el texto de reconocimiento;
- arquitectura;
- límites;
- **tabla de uso de IA con la verdad**, que las reglas del evento exigen declarar;
- equipo.

---

## 10. Reglas que valen para todo el mundo

1. **Píxeles honestos.** Cada fotograma muestra su fecha, λ, detector y colección. Nada se suaviza ni se inventa. Lo sintético se rotula «SIMULATED» y lo ilustrativo, «Illustrative render».
2. **Comparable o no se muestra.** Un fotograma fuera de la tolerancia de λ no entra en el blink; se muestra su motivo.
3. **Sin descubrimientos.** La app muestra el movimiento previsto de objetos conocidos. Planet X es la motivación, no un resultado.
4. **Créditos.** Se nombran SPHEREx, IRSA y el DOI; no se usan logos de la NASA ([DESIGN.md](../DESIGN.md)).
5. **Respeto a IRSA.** Como máximo 6 conexiones a la vez, caché siempre y ninguna descarga masiva.
6. **Costos.** GitHub Pages y Actions son gratis en repo público, y Hugging Face también en CPU basic. Nadie activa hardware de pago, almacenamiento persistente ni tarjetas.

## 11. Lo que no se construye

Búsqueda de Planet X en todo el cielo, GPU o *shift-and-stack*, motor n-body propio, base de datos, cuentas de usuario, detección con IA, espectros completos de 102 bandas, envío automático al Minor Planet Center ([PRODUCT.md](../PRODUCT.md); [investigacion_planet_x.md §11](investigacion_planet_x.md)).
