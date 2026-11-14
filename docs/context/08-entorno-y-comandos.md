# 08 · Entorno reproducible en Fedora y Windows

> **Recomendación, no obligación.** Cada persona, con su agente, puede elegir otro stack o herramientas para su módulo si respeta los contratos con los demás, deja un ADR con el motivo y documenta cómo correrlo en Fedora y Windows (ver `AGENTS.md` §3).

**Una sola herramienta global: [mise](https://mise.jdx.dev).** Fija las versiones de uv, Node, pnpm y lefthook, y además ejecuta las tareas. Con ella, personas y agentes usan **los mismos comandos en los dos sistemas**. No hace falta bash, make ni Docker en local.

Todas las versiones se verificaron el 14-nov-2026 (GitHub releases, npm y PyPI). También se corrió `uv lock` real con Python 3.13: astropy, reproject, numpy y fastapi tienen wheels para Windows y Linux. **No se probó en una máquina Windows real**: lo de Windows sale de la documentación y de los metadatos de los wheels.

## 1. Instalar (una vez por máquina)

**Fedora 44 (zsh)**

```bash
sudo snapper -c root create -d "instalar mise"
```

```bash
sudo dnf copr enable jdxcode/mise
```

```bash
sudo dnf install mise git
```

```bash
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc && exec zsh
```

**Windows 11 (PowerShell 7)**

```powershell
winget install --id Microsoft.PowerShell -e
winget install --id Git.Git -e
winget install --id jdx.mise -e
Add-Content $PROFILE 'mise activate pwsh | Out-String | Invoke-Expression'
git config --global core.autocrlf false
git config --global core.longpaths true
```

**En el repo (ambos sistemas):**

```bash
mise trust
```

```bash
mise install
```

```bash
mise run setup
```

## 2. Decisiones de herramientas

| Tema | Elección | Versión fijada | Por qué | Descartado |
| --- | --- | --- | --- | --- |
| Herramientas + tareas | **mise** | 2026.11.8 | Un solo `mise.toml` fija versiones y define tareas; shims `.exe` nativos en Windows | just (necesita `sh` en Windows), make (malo en Windows), Taskfile, scripts npm (no cubren Python) |
| Python | **uv** (instalado por mise) | 0.13.8 | `uv sync --locked` y `uv run` reproducen el entorno sin activar nada | pip, poetry, que mise maneje Python (dos gestores peleando) |
| Versión de Python | **3.13** (`.python-version`) | 3.13 | Wheels confirmados en Windows y Linux; numpy 2.5 exige ≥ 3.12 | 3.14 (funciona, menos margen), 3.12 |
| Lint/formato Python | **ruff** | 0.17.5 | Estándar, muy rápido | black + flake8 + isort |
| Tipos Python | **basedpyright** | 1.40.2 | Motor pyright estable, se instala como wheel | ty (aún beta 0.0.x), mypy (lento con astropy) |
| Tests | **pytest** / **vitest** | 9.2.0 / 5.1.0 | Estándar | — |
| Node | **24 LTS "Krypton"** | 24.22.3 | Soporte hasta abr-2028; Vite 8 lo soporta | 26 (LTS hace semanas), 22 |
| Gestor de paquetes JS | **pnpm** (+ `packageManager` en package.json) | 12.18.0 | Lockfile estricto (`--frozen-lockfile`); en Windows usa junctions, no symlinks | npm (más lento), bun (asperezas en Windows) |
| Lint/formato JS/TS | **Biome** | 2.6.7 | Un binario, `biome ci` | ESLint + Prettier (4+ paquetes) |
| TypeScript | **6.0.x** | 6.0.3 | TS 7 (compilador en Go) recién salido; migrar después del evento | 7.0.x |
| Hooks de Git | **lefthook** (vía mise) | 2.2.2 | Binario único, sin bash, funciona en Windows | husky, pre-commit, prek |
| Mensajes de commit | commitlint + config-conventional | 21.2.4 | Conventional Commits automático en el hook `commit-msg` | — |
| Entorno | Nativo + mise | — | Rápido de montar; los agentes CLI corren en el host | Devcontainers/Docker Desktop (WSL2, varios GB, lento en Windows). Docker solo para el despliegue del backend |

## 3. Tareas estándar (`mise run <tarea>`)

Hoy existen `setup`, `sync-skills` y `check-skills`. Cuando el equipo apruebe el stack y existan `frontend/` y `backend/`, se agregan estas (ya diseñadas):

| Tarea | Qué hace | Comandos |
| --- | --- | --- |
| `setup` | Preparar todo tras clonar | `uv sync --locked --project backend` · `pnpm -C frontend install --frozen-lockfile` · `scripts/bootstrap_env.py` · `lefthook install` · `sync_skills.py` |
| `dev` | Backend + frontend en paralelo | `uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` · `pnpm dev` |
| `test` | Todos los tests | `pytest backend/tests` · `pnpm -C frontend test --run` |
| `lint` | Lint + tipos | `ruff check` · `ruff format --check` · `basedpyright` · `biome ci .` · `tsc -b` |
| `fmt` | Formatear | `ruff format` · `biome check --write .` |
| `gen-api` | Contrato → tipos TS | `python -m app.export_openapi ../contracts/openapi.json` · `openapi-typescript` → `frontend/src/api/schema.d.ts` |
| `build` | Build de producción | `gen-api` + `pnpm -C frontend build` |
| `precompute` | Datos de demo offline | `uv run python -m app.precompute --out data/derived` |

Reglas para escribir tareas: **arrays de comandos simples**. Windows las ejecuta con `cmd /c`, que no se detiene ante un error y no entiende `&&`, tuberías ni `$VAR`. Toda lógica va en un script de Python en `scripts/`.

## 4. Reglas para agentes (instalar, correr, reproducir)

- Ejecuta todo con `mise run <tarea>`. Si falta una tarea, agrégala a `mise.toml`; no documentes comandos sueltos.
- Python solo con `uv run …` (nunca `pip install` ni activar el venv). Dependencias: `uv add <paquete>==<versión>`, y se commitea `uv.lock`.
- JS solo con `pnpm` (nunca npm ni yarn). Versiones exactas (`save-exact`), y se commitea `pnpm-lock.yaml`.
- Rutas con `pathlib` / `node:path`; archivos abiertos con `encoding="utf-8"`.
- Nada de scripts `.sh` en el flujo del proyecto; usa Python.
- Los nombres de archivo van en minúsculas kebab-case. Renombrar mayúsculas/minúsculas solo con `git mv`.

## 5. Git multiplataforma (ya configurado en el repo)

- `.gitattributes`: LF en todo, CRLF solo en `.cmd/.bat/.ps1`; binarios marcados (FITS, imágenes, fuentes, `.f32`).
- `.editorconfig`: UTF-8, LF, 2 espacios (4 en Python).
- **Sin symlinks en el repo.** `.claude/skills` es una copia generada desde `.agents/skills` (`mise run sync-skills`) y está en `.gitignore`.
- Datos crudos y derivados fuera de Git (`data/raw`, `data/derived`); se regeneran con `mise run precompute`.

## 6. Variables de entorno y secretos

- Se commitea `.env.example`; `.env` va en `.gitignore`. `scripts/bootstrap_env.py` copia el ejemplo si falta.
- Backend: `pydantic-settings` valida la configuración al arrancar.
- Frontend: solo las variables `VITE_*` llegan al navegador, así que ningún secreto va ahí.
- Los secretos de producción viven en los secretos del hosting y de GitHub Actions.

## 7. CI (cuando exista código)

GitHub Actions con matriz `ubuntu-latest` + `windows-latest`. Pasos: `jdx/mise-action` → `mise run setup` → `lint` → `test` → `build`, con caché de uv y pnpm. Las acciones se fijan por SHA. El despliegue corre solo en Linux.

## 8. Problemas típicos en Windows

1. Tareas en `cmd /c`: un comando por elemento del array; la lógica va en Python.
2. Nunca activar el venv (`Activate.ps1` choca con la ExecutionPolicy): usar `uv run`.
3. Clonar en un **Dev Drive** o, al menos, fuera de OneDrive: el antivirus hace varias veces más lentos a pnpm y uv.
4. WSL2: clonar en `~/` de Linux (no en `/mnt/c`). Nunca compartir `node_modules` ni `.venv` entre Windows y WSL.
5. `git config --global core.longpaths true` (ya está en la instalación).
6. El sistema de archivos no distingue mayúsculas: nombres en minúsculas y renombrar con `git mv`.
7. `PYTHONUTF8=1` ya está en `mise.toml` (Windows usa cp1252 por defecto).
8. Si el puerto 8000 falla, Hyper-V puede tenerlo reservado: `netsh int ipv4 show excludedportrange protocol=tcp`. Usar `127.0.0.1`, no `localhost`.
9. Windows bloquea archivos abiertos: detener `mise run dev` antes de `uv sync`.
10. Si una terminal de agente no carga el perfil de PowerShell, agregar al PATH la carpeta de shims de mise.

## Fuentes

[Instalar mise](https://mise.jdx.dev/installing-mise.html) · [Tareas TOML de mise (Windows `cmd /c`)](https://mise.jdx.dev/tasks/toml-tasks.html) · [Releases de mise](https://github.com/jdx/mise/releases) · [Informe de mise en Windows (may-2026, informal)](https://gist.github.com/gabrielmoreira/6419a34e1dd5d90f861db59a701b8a1a) · [uv](https://github.com/astral-sh/uv/releases) · [ruff](https://github.com/astral-sh/ruff/releases) · [ty en beta](https://pydevtools.com/blog/ty-beta/) · [basedpyright](https://github.com/DetachHead/basedpyright/releases) · [Índice de Node](https://nodejs.org/dist/index.json) · [lefthook](https://github.com/evilmartians/lefthook/releases) · [Biome](https://github.com/biomejs/biome/releases) · PyPI JSON de astropy, reproject y numpy.
