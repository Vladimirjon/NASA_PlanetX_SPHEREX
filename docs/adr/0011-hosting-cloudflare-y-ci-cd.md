# 0011 · Copernix en Cloudflare, con CI/CD desde GitHub Actions

- Estado: aceptada
- Fecha: 2026-11-15
- Decidido por: Daniel (con Claude Code)

## Contexto
El paquete estático de Copernix (`dist/landing`: landing, visor y demo de los cinco objetos, ≈ 24 MB, 1.7 mil archivos) tiene que estar publicado y accesible sin iniciar sesión. Medido desde Ecuador, Cloudflare respondió más rápido que Vercel (≈ 0,32 s frente a ≈ 0,55 s hasta el primer byte; una sola conexión y operador, repetir). La demo publicada no tiene API: el visor cae a la demo guardada cuando `/api` devuelve 404.

## Opciones consideradas
1. Vercel — ya probado (`copernix.vercel.app`), pero atiende desde São Paulo y el despliegue desde el repo exigía conectar la cuenta.
2. Cloudflare Workers con archivos estáticos + GitHub Actions — límites amplios y gratuitos, reglas de límite de peticiones disponibles para la API futura; el CI es reproducible y corre las pruebas antes de publicar.
3. Cloudflare con integración Git del panel — sin secretos en GitHub, pero no corre nuestras pruebas y exige autorizar la app de Cloudflare en el repositorio.

## Decisión
Publicar en Cloudflare (Worker `demo`, `https://demo.copernix.workers.dev`) y desplegar con `.github/workflows/copernix-site.yml`: en cada PR que toque el sitio se instalan dependencias, se corren lint, pruebas, `check-landing` y el empaquetado; en cada push a `main` se publica el mismo paquete y se prueba el sitio en vivo. `wrangler.jsonc` define el Worker; `deploy/cloudflare/` aporta `_headers` (caché y cabeceras de seguridad) y `404.html` (sin él Cloudflare respondería 200 con la landing a cualquier ruta, y el visor no caería a la demo).

## Consecuencias
- El token solo vive como secreto del entorno `production` de GitHub; los PR de forks nunca lo ven y solo `main` despliega. Las acciones están fijadas por SHA.
- Las pruebas se reintentan 2 veces porque `navigation.test.ts` (arrastre TAN) es intermitente en el motor.
- El backend (FastAPI, Python 3.13) no está desplegado: requiere otro servicio (propuesto: Hugging Face Spaces con Docker) y su propio CI. Hasta entonces el sitio es solo demo.
- `copernix.vercel.app` queda como respaldo; la ficha del Staff apunta a Cloudflare.

## Puesta en marcha (una vez, la hace quien administra el repositorio)
1. Cloudflare → *My Profile → API Tokens → Create Token* con la plantilla **Edit Cloudflare Workers**, limitado a la cuenta del Worker. Copiar el token y el *Account ID* (panel de Workers & Pages).
2. GitHub → *Settings → Environments → production* (créalo) → añadir los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. Opcional: restringir el entorno a la rama `main`.
3. Lanzar el flujo (*Actions → Copernix site → Run workflow*) y comprobar que `Smoke test the live site` termina en verde.
- Volver atrás: `npx wrangler rollback` (o *Deployments → Rollback* en el panel de Cloudflare).
