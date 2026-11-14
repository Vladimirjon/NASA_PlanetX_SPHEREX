# 0001 · AGENTS.md como fuente única de contexto para agentes

- Estado: aceptada
- Fecha: 2026-11-14
- Decidido por: Dax

## Contexto
El equipo usa Claude Code, Codex, Cursor, OpenCode y Gemini CLI. Cada uno lee archivos distintos; sin un estándar, cada chat arranca con contexto diferente.

## Opciones consideradas
1. Un archivo por herramienta (CLAUDE.md, .cursorrules, GEMINI.md…) — se desincronizan.
2. `AGENTS.md` (estándar abierto) + puentes mínimos — un solo lugar que mantener.

## Decisión
`AGENTS.md` en la raíz es la verdad. `CLAUDE.md` solo contiene `@AGENTS.md`. `.gemini/settings.json` apunta a `AGENTS.md`. Skills en `.agents/skills/`; `.claude/skills` es una copia generada (`mise run sync-skills`) porque los symlinks fallan en Windows (ver ADR 0005).

## Consecuencias
Mantener AGENTS.md corto (<200 líneas; Codex corta a 32 KiB). El detalle va en `docs/context/` y en skills.
