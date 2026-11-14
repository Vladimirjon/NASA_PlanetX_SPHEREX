# STATE — NASA Space Apps 2026 (equipo Na za, reto Planet X and SPHEREx)

Actualizado: sábado 14 de noviembre de 2026, 10:55.

## Dónde está el trabajo

- `docs/ROLES.md` es el plan vigente. Contiene:
  - los cinco roles (A datos y API, B ciencia, C motor de imagen, D app web, E pipeline y UX), todavía sin asignar;
  - el mapa de dependencias (Mermaid), la ruta crítica y la matriz paso por paso, con su plan B;
  - las señales de entrega con hora, los contratos, el horario y la ficha a fondo de cada rol.
- Documentos de referencia:
  - en la raíz, `PRODUCT.md` y `DESIGN.md`;
  - en `docs/`, `problema.md`, `resources.md`, `reglas_evento.md`, `plan_tecnico.md`, `ux_spec.md`, `maqueta.html` e `investigacion_planet_x.md`.
- Commit `468c143` con la primera versión de la documentación. Los cambios de las 10:55 (`ROLES.md` reescrito, `plan_tecnico.md` sin el Student Pack y este archivo) aún no tienen commit.
- Todavía no hay código.

## Decisiones tomadas hoy

- **Nombre:** pendiente. Constante única `APP_NAME` en `frontend/src/config.ts`; E propone 3 nombres a las 14:00 y se decide antes de las 21:00.
- **Horario:** se corrió por el reparto tardío. H0 a las 12:15, H1 a las 14:45, mínimo desplegado (H2) a las 19:00 y congelación a las 02:00.
- **Despliegue temprano:** el backend se despliega a las 14:45 con las épocas reales, sin esperar al fotograma real.
- **Trabajo en paralelo:** stub de la API, fixtures FITS locales y `LazyImage` que abre rutas locales, para que nadie espere a otro rol.
- **Dependencias:** solo A toca `pyproject.toml` y `uv.lock`; solo D toca `package.json` y su lock.
- **Formato del fotograma:** un único formato, JSON con float32 en base64, igual en la API y en la galería.
- **Peticiones:** un fotograma por petición (`/api/frame`).
- **Rutas y respaldo:** *hash routing* en Pages; para el proyector, `vite preview` en local.
- **Selección de imágenes:** tolerancia de λ de un canal (λ/R), con como máximo 3 imágenes por época.
- **`FLAGS`:** `NONLINEAR` no se enmascara al mostrar la imagen.
- **README final:** lo escribe A el domingo, con la plantilla de la sección 11 de `ROLES.md`.
- **Sin Student Pack:** se quitaron Sentry, Azure, Codespaces, Copilot y los dominios. El stack es solo GitHub (Pages y Actions) y Hugging Face CPU basic, todo gratis.

## Falta

- Llenar la tabla de reparto (sección 0 de `ROLES.md`) a las 11:00.
- Que la cuenta `Vladimirjon` configure el repo según la sección 2.3 de `ROLES.md`.
- Hacer commit de los cambios de las 10:55.

## Aprendido

- El reparto tardó más de lo previsto: el horario debe medirse desde la hora real del reparto, no desde las 09:00.
- El diagrama Mermaid de `ROLES.md` no se renderizó en local; revisarlo en GitHub tras el commit.
