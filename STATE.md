# STATE — NASA Space Apps 2026 (equipo Na za, reto Planet X and SPHEREx)

Actualizado: sábado 14 de noviembre de 2026, 10:00.

## Dónde está el trabajo

- `docs/ROLES.md` es el plan vigente: cinco roles (A datos y API, B ciencia, C motor de imagen, D app web, E pipeline y UX), **sin asignar**, con contratos, horario y pasos exactos.
- Documentos copiados desde `Desktop/inf`, sin el nombre provisional del producto:
  - `PRODUCT.md` y `DESIGN.md` en la raíz;
  - en `docs/`: `problema.md`, `resources.md`, `reglas_evento.md`, `plan_tecnico.md` (el antiguo `plan_equipo.md`, sin reparto por nombre), `ux_spec.md`, `maqueta.html` e `investigacion_planet_x.md`.
- No se copiaron, por no ser esenciales:
  - `stack.md`, repetido en `plan_tecnico.md`;
  - `referencias_diseno.md`;
  - los bocetos descartados y el estado interno de `.impeccable`.

  La maqueta de `.impeccable/mocks/hifi` es idéntica a `Previa/maqueta.html`.
- Todavía no hay código. Nada de esto está en un commit.

## Decisiones tomadas hoy

- **Nombre:** pendiente. Constante única `APP_NAME` en `frontend/src/config.ts`; E propone 3 nombres a las 13:00.
- **Formato del fotograma:** un único formato, JSON con float32 en base64, igual en la API y en la galería. Sustituye al borrador de PNG.
- **Peticiones:** un fotograma por petición (`/api/frame`).
- **Rutas:** routing con *hash* en GitHub Pages.
- **Respaldo del proyector:** `vite preview` local en lugar de un Service Worker.
- **Selección de imágenes:** tolerancia de longitud de onda de un canal (λ/R), con como máximo 3 imágenes por época.
- **`FLAGS`:** `NONLINEAR` no se enmascara al mostrar la imagen, para no dejar un agujero en Barnard.

## Falta

- Llenar la tabla de reparto (sección 0 de `ROLES.md`).
- Que la cuenta `Vladimirjon` configure el repo: público, Pages con Actions, variable `API_BASE` y protección de `main`.
- Hacer commit de estos documentos.

## Aprendido

- Las 4 invitaciones al repo (`cschavezv03-ops`, `danielife05`, `daxrpm`, `mateobtw`) estaban pendientes de aceptar a las 09:45.
