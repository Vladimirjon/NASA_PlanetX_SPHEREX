# 05 · Estándares para trabajar con agentes (Claude Code, Codex, Cursor, OpenCode, Gemini)

> **Recomendación, no obligación.** Cada persona, con su agente, puede elegir otro stack o herramientas para su módulo si respeta los contratos con los demás, deja un ADR con el motivo y documenta cómo correrlo en Fedora y Windows (ver `AGENTS.md` §3).

Objetivo: que **cualquier chat nuevo, en cualquier herramienta, de cualquier persona** arranque con el mismo contexto y trabaje igual. Investigado el 14-nov-2026 en docs oficiales (enlaces al final).

## 1. Cómo carga cada herramienta el contexto

| Herramienta | Instrucciones | Skills del proyecto | Notas |
| --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` → importa `@AGENTS.md` | `.claude/skills` (**copia** generada por `mise run sync-skills`, en `.gitignore`) | Un `CLAUDE.local.md` sin el import hace que ignore AGENTS.md: no lo crees |
| Codex CLI | `AGENTS.md` (raíz → carpeta actual) | `.agents/skills` | Límite combinado **32 KiB**; lo que exceda se corta en silencio |
| Cursor | `AGENTS.md` (raíz y anidados) | `.agents/skills`, también lee `.claude/skills` | Reglas propias solo en `.cursor/rules/*.mdc`; no las necesitamos |
| OpenCode | `AGENTS.md` | `.agents/skills`, `.claude/skills` | — |
| Gemini CLI | `.gemini/settings.json` → `AGENTS.md` | `.agents/skills` | Ya configurado |
| ChatGPT/Claude web (sin repo) | Pega `docs/context/00-prompt-arranque.md` | — | Para estudiar o redactar, no para editar el repo |

**Sin symlinks:** fallan en Windows sin modo desarrollador. `.agents/skills` es la única fuente; `mise run setup` la copia a `.claude/skills`.

**Dato clave (eval de Vercel, 2026):** los agentes **no invocaron la skill en el 56 % de los casos**, mientras que las reglas escritas en AGENTS.md se respetaron siempre. Por eso las reglas críticas (datos reales, semáforo, anti-slop, stack, gráficas) están **en AGENTS.md**, y las skills solo aportan el detalle.

## 2. Flujo de trabajo (igual para humanos y agentes)

```
Idea/tarea → brainstorming (spec corto, humano aprueba)
           → writing-plans (tareas de 2–15 min)
           → TDD solo en lógica de datos/ciencia (Python, matemática de imagen)
           → verification-before-completion (salida real de tests/lint/build)
           → differential-review + /code-review → PR → humano aprueba → merge
Bug → systematic-debugging (causa raíz primero)
```

Tamaño: una tarea trivial (texto, estilo, un fix de una línea) no necesita spec; todo lo demás sí, aunque sean 5 líneas en el PR.

**Anti-ceremonia (hackathon):** brainstorming y plan **una vez por feature**, no por cada cambio pequeño. Hay reportes de que superpowers gasta 1–3 % del uso sin cambiar código si se aplica a todo. TDD no se aplica a retoques de UI; ahí la verificación es con capturas de Playwright.

## 3. Skills del proyecto (`.agents/skills/`, fijadas por commit)

Elegidas por **evidencia de calidad** (comparativas lado a lado, issues de GitHub, auditorías de seguridad), **no por estrellas**. Versiones, commits y licencias: `.agents/SKILLS.lock.md`.

| Skill | Origen | Cuándo | Evidencia |
| --- | --- | --- | --- |
| `brainstorming`, `writing-plans` | obra/superpowers | Una vez por feature | La librería de disciplina de ingeniería más sólida según comparativas con gstack |
| `test-driven-development` | obra/superpowers | Lógica Python, matemática de imagen y contratos | Evita código que "parece" funcionar |
| `systematic-debugging` | obra/superpowers | Cualquier bug | Causa raíz antes del fix |
| `verification-before-completion` | obra/superpowers | Antes de decir "listo" | Evidencia, no promesas |
| `frontend-design` | anthropics/skills | **Una vez**: dirección visual → `DESIGN.md` | Saca al modelo de su look por defecto (Paralect, oct-2026). Riesgo: empuja a estéticas atrevidas, y por eso `07-estandar-ui.md` fija una dirección sobria |
| `impeccable` | pbakaus/impeccable | `init` (PRODUCT.md), `document` (DESIGN.md), `critique`/`audit`/`polish` antes de cada PR de UI; detector `npx impeccable detect` | Encontró bugs reales sin cambiar el look (Paralect); detector determinista de 62 reglas sin LLM |
| `web-design-guidelines` | vercel-labs/agent-skills | Revisión final de UI (`archivo:línea`) | Web Interface Guidelines de Vercel; **copia local**, sin descargar en tiempo de ejecución |
| `accessibility` | addyosmani/web-quality-skills | Pasada WCAG 2.2: teclado, foco, contraste, movimiento reducido | Específica y liviana |
| `vercel-react-best-practices` | vercel-labs/agent-skills | Escribir o revisar componentes | Más de 40 reglas de rendimiento. Saltar las secciones de Next.js/RSC (usamos Vite) |
| `vercel-composition-patterns` | vercel-labs/agent-skills | Cuando un componente acumula props | Incluye API de React 19 |
| `playwright-cli` | microsoft/playwright-cli | E2E, capturas de las vistas blink/diferencia | ~22 tokens hasta usarse vs ~4,4k por petición del MCP; mejor mantenida que `webapp-testing` |
| `scientific-charts` | **propia del equipo** | Antes de cualquier gráfica o vista de imagen | Reglas de gráficas de publicación; la skill `dataviz` de Anthropic solo existe dentro de Claude Code |
| `modern-python` | trailofbits/skills | Backend: uv, ruff, pytest | Trail of Bits, mantenida activamente |
| `differential-review` | trailofbits/skills | Antes de mergear a `main` (solo el diff) | Revisión de seguridad que ajusta la profundidad al tamaño del cambio |

**Fuera del repo:** la skill oficial de **FastAPI** viene dentro del paquete y se instala cuando exista el backend, con `uvx library-skills install --skill fastapi`. Va sincronizada con la versión instalada de FastAPI.

**Descartadas (con evidencia):**

| Skill | Por qué no |
| --- | --- |
| `ui-ux-pro-max` | Genérica y con bugs: issue #446 abierto, "Degrades Website Design Instead of Improving It"; #484, una eval de 200 corridas encontró que el 82 % de sus archivos nunca se abre; auditoría TAR de 24/100 con 5 hallazgos altos (prompt injection, `sudo`); conflicto de licencia. Paralect: "la página más convencional del test" |
| `design-taste-frontend` | Pensada para landing pages, no para herramientas con muchos datos; v2 experimental |
| `anti-ui-slop` | Su valor depende de un MCP de pago; sin reseñas independientes |
| `no-slop-ui` | Sin evidencia; duplica impeccable sin detector |
| `webapp-testing` | Desactualizada (abr-2026); reemplazada por `playwright-cli` |
| `gstack` | La más pesada (57 skills), alto costo de tokens |
| `api-design-principles` | Redundante: las reglas de API (RFC 9457, contrato primero) ya están en AGENTS.md y en la skill oficial de FastAPI |

**Conflictos a evitar:**
- Una sola skill de dirección de diseño (`frontend-design`). Las demás dan reglas contradictorias de fuentes y paletas.
- No tener la misma skill duplicada globalmente (`~/.claude/skills`) y en el repo con versiones distintas: **gana la del repo**. Si tienes una copia global, desactívala para este proyecto.

**Seguridad de skills (cadena de suministro):**
- Snyk ToxicSkills (2026) auditó 3984 skills: el 13,4 % tenía fallas críticas y 76 eran maliciosas.
- Reglas:
  - Solo skills copiadas al repo con commit fijado.
  - Leer el diff de SKILL.md y de los scripts antes de actualizar.
  - Nada de `@latest`.
  - Nunca activar `enableAllProjectMcpServers`.
  - Mantener activas las confirmaciones de permisos del agente.
- **Prohibido el "live mode" de impeccable:** su paso "Apply" puede lanzar agentes con `--dangerously-bypass-approvals-and-sandbox`. Si alguien lo necesita, antes debe fijar `IMPECCABLE_LIVE_COPY_AGENT=chat`.

**Cómo invocarlas:**
- **Claude Code:** escribe `/nombre-skill`.
- **Codex, Cursor y OpenCode:** se cargan solas por su descripción. Si no se activa, pide: "lee `.agents/skills/<nombre>/SKILL.md` y síguelo".

## 4. Estándar UX

La norma completa está en **`docs/context/07-estandar-ui.md`** (prohibiciones anti-slop, sistema visual, gráficas, estados, accesibilidad y puerta de calidad por PR). Orden para cualquier pantalla:
1. Leer `04-vision-ux.md`, `07-estandar-ui.md`, `PRODUCT.md` y `DESIGN.md`.
2. Implementar cubriendo todos los estados.
3. `impeccable critique` + `audit` · `web-design-guidelines` · `accessibility` · `scientific-charts` si hay gráficas.
4. `playwright-cli`: capturas de escritorio, móvil, proyector y movimiento reducido en el PR.

## 5. Contratos entre partes (para que nadie se bloquee)

- **API:** `contracts/openapi.yaml` es la verdad. Cambia primero el contrato, luego backend y frontend. Los tipos TS se generan (`openapi-typescript`); prohibido escribirlos a mano. CI falla si el contrato y los tipos divergen.
- **Errores API:** formato RFC 9457 (`application/problem+json`: `type`, `title`, `status`, `detail`).
- **Datos de prueba:** fixtures pequeñas versionadas para que frontend avance sin backend (mock del contrato).
- **Decisiones:** ADR en `docs/adr/NNNN-titulo.md` (plantilla `0000-template.md`). Un agente no contradice un ADR sin proponer uno nuevo.
- **Estado compartido:** `docs/STATE.md` es la pizarra. Se actualiza al final de cada sesión de agente y en cada reunión corta.

## 6. Comunicación del equipo

- **Reunión de 5 min cada ~3 h** (pie): qué hice, qué sigue, qué me bloquea → se refleja en `STATE.md`.
- **Un dueño por carpeta** (tabla en `STATE.md`). Cambiar algo ajeno = avisar en el PR.
- **Agentes en paralelo:** una rama o `git worktree` por agente. Nunca dos agentes editando los mismos archivos.
- **Pregunta científica** que nadie sabe → se anota en `STATE.md` → "Preguntas para mentor" y se lleva al Bloque 4.

## 7. MCP recomendados (opcionales, cada uno instala el suyo)

| MCP | Para qué | Instalar |
| --- | --- | --- |
| Context7 | Docs actualizadas de librerías (evita APIs inventadas) | `npx @upstash/context7-mcp@4.7.0` |

Para navegador se prefiere la skill `playwright-cli` sobre Playwright MCP (mucho menos contexto). Cada MCP consume contexto: no agregar más sin acordarlo.

## 8. "Definition of Done"

Un cambio está terminado solo si: tests pasan · lint/typecheck limpio · build OK · screenshots (si es UI) · `STATE.md` actualizado · sin secretos · datos y afirmaciones científicas citadas · IA registrada en `AI_USAGE.md`.

## Fuentes

Skills: [Paralect, comparativa de skills de diseño (oct-2026)](https://www.paralect.com/skills/top-design-skills) · [Superdesign (jul-2026)](https://superdesign.dev/blog/design-skills-reviewed) · [issues de ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/issues) · [auditoría TAR](https://tarai.dev/en/skill/ui-ux-pro-max/) · [Vercel: AGENTS.md supera a las skills](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) · [Playwright CLI vs MCP](https://bug0.com/blog/playwright-cli-vs-playwright-mcp-ai-browser-testing-2026) · [FastAPI y desarrollo con IA](https://fastapi.tiangolo.com/ai-development/) · [Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) · [trailofbits/skills](https://github.com/trailofbits/skills) · [web-quality-skills](https://github.com/addyosmani/web-quality-skills) · [playwright-cli](https://github.com/microsoft/playwright-cli)

Agentes: 
[agents.md](https://agents.md) · [Claude Code memory](https://code.claude.com/docs/en/memory) · [Claude Code skills](https://code.claude.com/docs/en/skills) · [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) · [Codex skills](https://developers.openai.com/codex/skills) · [Cursor rules](https://cursor.com/docs/context/rules) · [Cursor skills](https://cursor.com/docs/context/skills) · [OpenCode skills](https://opencode.ai/docs/skills/) · [Agent Skills spec](https://agentskills.io/specification) · [impeccable](https://github.com/pbakaus/impeccable) · [anthropics/skills](https://github.com/anthropics/skills) · [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) · [superpowers](https://github.com/obra/superpowers) · [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) · [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) · [Conventional Commits](https://www.conventionalcommits.org)
