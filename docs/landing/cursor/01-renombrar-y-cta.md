# Encargo 1 · Renombrar a Copernix y conectar los CTA

Carpeta tuya: **`landing/`** (más `landing/README.md`). No toques `frontend/`, `backend/` ni `scripts/`.

1. **Renombrar** el producto «NA ZA» → **Copernix** en `landing/index.html` (`<title>`, marca del menú, pie, `aria-label`s), `landing/js/app.js` (`document.title`), `landing/js/i18n.js` (ES y EN, mismas claves en ambos) y `landing/README.md`. «NA ZA» sobrevive solo como crédito del equipo, p. ej. en el pie: «Un proyecto del equipo NA ZA · NASA Space Apps 2026». Busca con `grep -rni "na za\|naza\|na-za" landing` y decide caso por caso; claves técnicas internas (`naza_lang` en localStorage) pueden quedarse.
2. **Conectar los CTA al visor**, que vive en la ruta **`/viewer/`** (otro encargo lo construye; no lo implementes aquí):
   - Elimina `VIEWER_READY` y el aviso (toast) en `landing/js/app.js`; los CTA navegan de verdad.
   - Menú «Explorar el cielo» y el botón principal del hero → `/viewer/`.
   - «Explorar este punto» (`#vCta`, sección «how»): si hay un objetivo seleccionado en los chips → `/viewer/?target=<slug>`; si el usuario escribió coordenadas → `/viewer/?ra=<RA>&dec=<Dec>`. Slugs: `wise-0855`, `barnards-star`, `epsilon-indi-b`, `rw-aurigae`, `r-draconis` (ver `frontend/src/app/core/targets.ts`; `TARGETS` de `landing/js/app.js` usa ids `wise`, `barnard`, `eps`, `rw`, `rdra`: crea el mapeo en un solo lugar).
   - Cada una de las 5 tarjetas de «Cinco objetos para probar» gana un enlace discreto de texto «Verlo en Copernix →» / «Open in Copernix →» (con subrayado, sin caja) hacia `/viewer/?target=<slug>`.
   - Conserva los `data-cta` y el conteo `NZ.cta` / `NZ.track`.
3. Actualiza `landing/README.md` (sección del visor: ya no es «pendiente»; los enlaces apuntan a `/viewer/`) y quita de las claves i18n lo que quede sin uso.
4. Verifica: `node scripts/check-landing.mjs` (desde la raíz) debe pasar; `node tests/landing/render-scheduler.test.mjs` y `node tests/landing/satellite.test.mjs` también. Los tests de `tests/landing/browser-smoke.cjs` esperan nombres/CTA actuales: si algo depende del toast o de `VIEWER_READY`, ajusta el test.
