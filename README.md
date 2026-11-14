# Planet X and SPHEREx · Team Na za · NASA Space Apps Challenge 2026

**EN** · A public web tool to pick any region of the sky, watch real NASA SPHEREx infrared images of it over time, and understand what changed — with a simple layer for everyone and an expert layer for those who want to go deeper. *(Work in progress — app name pending.)*

**ES** · Una herramienta web pública para elegir cualquier región del cielo, ver las imágenes infrarrojas reales de SPHEREx (NASA) de esa zona a lo largo del tiempo y entender qué cambió, con una capa simple para todos y una capa experta para quien quiera profundizar. *(En desarrollo; nombre pendiente.)*

## For the team / Para el equipo

Start with [AGENTS.md](AGENTS.md), then [docs/STATE.md](docs/STATE.md) and [docs/context/](docs/context/). Setup (Fedora / Windows): install [mise](docs/context/08-entorno-y-comandos.md), then `mise trust`, `mise install`, `mise run setup`.

## Quick start / Inicio rápido

**EN** · Backend (Python 3.13 + uv) and frontend (Node + pnpm) run the same on Fedora and Windows.
**ES** · Backend (Python 3.13 + uv) y frontend (Node + pnpm) se corren igual en Fedora y Windows.

```bash
mise run api-dev     # API → http://127.0.0.1:8000/docs
mise run web-dev     # App → http://127.0.0.1:5173
```

Without mise / Sin mise:

```bash
uv run --directory backend uvicorn --factory skyshift.api.app:create_app --port 8000
pnpm --dir frontend install
pnpm --dir frontend dev
```

Checks / Verificación: `mise run api-test`, `mise run api-lint`, `mise run web-test`, `mise run web-lint`, `mise run web-build`; live smoke of the 5 challenge objects / prueba en vivo de los 5 objetos: `mise run smoke`.

Architecture / Arquitectura: [backend/AGENTS.md](backend/AGENTS.md), [frontend/AGENTS.md](frontend/AGENTS.md), ADRs 0040–0044 in [docs/adr/](docs/adr/), API contract [contracts/openapi.yaml](contracts/openapi.yaml), science data map [docs/context/12](docs/context/12-mapa-de-datos-spherex.md).

## Data / Datos

NASA SPHEREx Spectral Images from the NASA/IPAC Infrared Science Archive (IRSA). Acknowledgement text and dataset DOI will be added before submission. / Imágenes de SPHEREx del archivo IRSA (NASA/IPAC). El texto de reconocimiento y el DOI se agregan antes de la entrega.

## AI use / Uso de IA

See [docs/AI_USAGE.md](docs/AI_USAGE.md).

## License / Licencia

[MIT](LICENSE)
