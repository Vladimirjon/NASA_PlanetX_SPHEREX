# 0004 · Toolchain multiplataforma con mise + uv + pnpm

- Estado: **recomendación** (no obligatoria; obligatorio solo que todo corra y esté documentado en Fedora y Windows)
- Fecha: 2026-11-14
- Decidido por: Dax

## Contexto
El equipo usa Fedora y Windows; los agentes deben instalar, correr y reproducir todo con los mismos comandos.

## Opciones consideradas
1. Herramientas sueltas (nvm, pip, make): diferentes por sistema operativo.
2. Devcontainers/Docker: pesado en Windows (WSL2, varios GB).
3. **mise** (versiones + tareas) + uv (Python) + pnpm (JS).

## Decisión
Opción 3, con versiones fijadas en `mise.toml`: Python 3.13, Node 24 LTS, ruff, basedpyright, Biome, lefthook y commitlint. Detalle en `docs/context/08-entorno-y-comandos.md`.

## Consecuencias
Cada persona instala mise una vez. Las tareas son comandos simples y la lógica va en Python. Sin symlinks ni `.sh`.
