# AGENTS.md — Equipo Na za · NASA Space Apps 2026 · "Planet X and SPHEREx"

Fuente única de verdad para cualquier agente (Claude Code, Codex, Cursor, OpenCode, Gemini CLI) y para las 5 personas del equipo. `CLAUDE.md` solo importa este archivo. Si algo aquí contradice otro documento, gana este archivo; si está desactualizado, actualízalo en el mismo PR.

## 1. Qué estamos construyendo (una línea)

Una herramienta web pública para que **cualquier persona** elija una región del cielo (RA/Dec), vea las imágenes reales de SPHEREx de esa región a lo largo del tiempo como un pequeño video, **identifique y entienda qué cambió**, y pueda bajar a una capa experta si quiere. Visión y decisiones abiertas: `docs/context/04-vision-ux.md`. Nombre provisional: **SkyShift**.

**Ya acordado por el equipo** (guía de onboarding v0.1): comparación **temporal** de una misma región; público prioritario **sin conocimientos de astronomía**; fuentes centrales **SPHEREx/IRSA** y sus tutoriales oficiales. NEOSSat no entra al MVP. Fuera de alcance: descubrir Planet X, catalogar objetos nuevos automáticamente, analizar todo el cielo en tiempo real, entrenar IA astrofísica.

**Semáforo de interpretación (obligatorio en UI, textos y pitch):**
- **Observado:** "las imágenes muestran una diferencia aparente".
- **Evaluado:** "la diferencia persiste tras los controles de calidad" (misma región, fechas distintas, λ compatible, geometría alineada, FLAGS revisados, procedencia trazable).
- **Confirmado:** validado con evidencia científica suficiente. **El software nunca asigna este nivel por sí solo.**

Nunca separar una imagen de sus metadatos de procedencia (archivo, fecha, banda/λ, colección).

## 2. Lee antes de actuar (en este orden)

| Archivo | Para qué |
| --- | --- |
| `docs/Onboarding_Planet_X_SPHEREx_v0.1.md` | **Guía del equipo** (autoridad humana): problema, fundamentos, flujo, decisiones acordadas |
| `docs/STATE.md` | Qué está pasando ahora, quién tiene qué, bloqueos. **Léelo siempre primero.** |
| `docs/context/01-reto-y-jurado.md` | Reto oficial, rúbrica de Sangolquí, entregables y plazos |
| `docs/context/02-ciencia-para-cs.md` | Física explicada para personas de CS (sin asumir nada) |
| `docs/context/03-datos-y-apis.md` | APIs de NASA/IRSA medidas: endpoints, latencias, trampas |
| `docs/context/04-vision-ux.md` | Visión de producto y UX (prioridad #1) |
| `docs/context/05-estandares-agentes.md` | Flujo de trabajo, skills, contratos, Git, comunicación |
| `docs/context/06-stack-propuesto.md` | Stack técnico propuesto (bajo y alto nivel) |
| `docs/context/07-estandar-ui.md` | **Norma de UI formal y anti-slop** (obligatoria para cualquier UI) |
| `docs/context/08-entorno-y-comandos.md` | Instalar y correr todo igual en Fedora y Windows |
| `docs/GLOSARIO.md` | Términos de astronomía en lenguaje simple |
| `docs/fuentes/` | Rúbrica oficial de Sangolquí (PDF) y otras fuentes primarias |
| `docs/adr/` | Decisiones tomadas. No propongas lo contrario sin leer el ADR. Rangos de 10 por integrante (Dax: 0040–0049; 0000–0005 compartidos) |

`docs/archive/` es material viejo: **no es fuente de verdad**; úsalo solo como referencia y verifica todo dato que tomes de ahí.

## 3. Obligatorio vs. recomendado

**Obligatorio para todos:** las reglas duras (§4), el semáforo de interpretación, la norma de UI sin "AI slop" (§7), los idiomas de entrega y los **contratos entre módulos** (formato de datos/API que otro integrante consume).

**Recomendado (no obligatorio):** stack, librerías, herramientas, skills y comandos de §6, §8 y `docs/context/05`, `06` y `08`. Son un punto de partida investigado, no una imposición. **Cada persona, con su agente, puede definir el mejor stack y las mejores herramientas para su módulo**, con tres condiciones:
1. Respeta el contrato con los demás módulos. Si lo cambia, avisa al dueño del otro lado antes.
2. Deja la elección en un ADR corto (`docs/adr/`) con el motivo, para que otros agentes no la contradigan.
3. Documenta cómo instalar y correr su parte en Fedora **y** Windows (idealmente como tarea de `mise.toml`; si no, en el `AGENTS.md` de su carpeta).

## 4. Reglas duras (no negociables)

1. **La idea es del equipo.** La guía oficial 2026 prohíbe usar IA para "idear cómo resolver el reto". Los agentes investigan, presentan opciones con pros/contras y ejecutan; **las decisiones de producto las toman humanos** y quedan en un ADR. Ningún módulo se delega a un agente sin una ficha aprobada (`docs/specs/0000-plantilla-ficha-agente.md`).
2. **Datos reales, nunca inventados.** Cada píxel, número o afirmación científica viene de una fuente citada (IRSA, Gaia, JPL, paper). Prohibido fabricar datos, resultados o "detecciones". La app nunca afirma un descubrimiento.
3. **Ciencia honesta.** No prometer encontrar Planet X/Planet Nine. Si no sabes si algo es físicamente correcto, márcalo `[VERIFICAR]` y pregunta al rol de ciencia.
4. **Registro de IA.** Todo uso relevante de IA se anota en `docs/AI_USAGE.md` (herramienta, para qué, qué revisó un humano). Imágenes generadas con IA llevan marca de agua. Nunca generar ni modificar logos/identificadores de NASA.
5. **Sin secretos en el repo.** Nada de `.env`, tokens ni credenciales. Usa variables de entorno.
6. **Verificación antes de "listo".** Ningún agente dice "terminado" sin mostrar salida de tests, lint y build. Para UI: screenshot.
7. **Contrato primero.** La API se define en `contracts/openapi.yaml` antes de implementarla; los tipos del frontend se generan, no se escriben a mano.
8. **No tocar fuera de tu tarea.** Respeta la tabla de dueños en `docs/STATE.md`. Si necesitas cambiar algo ajeno, dilo en el PR y avisa a su dueño.
9. **Dependencias fijadas.** Versión exacta (lockfiles). Nueva dependencia = una línea de justificación en el PR.
10. **Calidad de código:** sin `any` para callar tipos, sin `except: pass`, sin `# type: ignore` sin motivo, validación en el borde (entradas de usuario y respuestas de APIs externas).

## 5. Idiomas

- **Código, identificadores, commits, UI de la app:** inglés.
- **Documentos del equipo y conversación con agentes:** español, simple y corto.
- **Entregables (README, ficha del proyecto, slides):** bilingües ES/EN (la rúbrica local penaliza −1 si falta uno). Pitch en vivo: español.

## 6. Flujo de trabajo recomendado (todas las herramientas)

Obligatorio: ficha aprobada antes de delegar un módulo y evidencia (tests/lint/build/capturas) antes de decir "listo". Las skills de la tabla son la recomendación; cada persona puede usar otras equivalentes con su agente.

| Paso | Skill | Salida |
| --- | --- | --- |
| 1. Entender y diseñar (una vez por feature) | `brainstorming` | Ficha en `docs/specs/` aprobada por un humano |
| 2. Planear | `writing-plans` | Tareas pequeñas y verificables |
| 3. Implementar | `test-driven-development` (lógica Python, matemática de imagen, contratos) | Test rojo → verde |
| 4. Bug | `systematic-debugging` | Causa raíz antes del fix |
| 5. UI | `frontend-design` (dirección, una vez) · `impeccable` · `web-design-guidelines` · `accessibility` · `scientific-charts` · `playwright-cli` | Puerta de calidad de `docs/context/07-estandar-ui.md` §8 |
| 6. Cerrar | `verification-before-completion` · `differential-review` | Evidencia en el PR |

Skills: `.agents/skills/` es la única fuente (fijadas en `.agents/SKILLS.lock.md`). Claude Code usa la copia `.claude/skills` que genera `mise run setup`. Si tu herramienta no carga una skill, abre su `SKILL.md` y síguelo. Prohibido el "live mode" de impeccable y agregar skills sin revisar su código.

## 7. UI: cero "AI slop" (regla absoluta)

Interfaz de **instrumento científico**: formal, moderna, sobria; la imagen del cielo es la protagonista; **solo los controles necesarios** (lo experto va en la capa Inspeccionar). Prohibido: gradientes morados/aurora, glassmorphism, neón, héroes de marketing, rejillas de tarjetas genéricas, emojis, sombras profundas y radios > 8 px, estrellas o partículas decorativas, animación sin propósito, paletas arcoíris/jet, gráficas 3D o de pastel, textos de relleno o cifras inventadas. Tipografía IBM Plex Sans/Mono con `tabular-nums`; un solo acento; todo desde tokens. Gráficas de nivel publicación: unidades, incertidumbre, fuente, fecha y λ siempre visibles. Detalle y puerta de calidad: `docs/context/07-estandar-ui.md`. **Un PR de UI que lo viole no se mergea.**

## 8. Entorno y comandos (Fedora y Windows) — recomendado

Recomendación, no obligación (ver §3). Lo obligatorio es que cualquier parte se pueda instalar y correr en Fedora y Windows, y que el cómo quede documentado.

- Herramienta global sugerida: **mise** (fija uv, Node 24, pnpm, lefthook y ejecuta tareas). Instalación: `docs/context/08-entorno-y-comandos.md`.
- Tras clonar: `mise trust` → `mise install` → `mise run setup`. Todo se ejecuta con `mise run <tarea>`.
- Python solo con `uv run` / `uv add pkg==versión` (Python 3.13, nunca `pip install` ni activar venv). JS solo con `pnpm` y versiones exactas. Commitear `uv.lock` y `pnpm-lock.yaml`.
- Tareas de `mise.toml` = arrays de comandos simples (Windows usa `cmd /c`: sin `&&`, pipes ni `$VAR`); la lógica va en scripts Python de `scripts/`. Nada de `.sh`.
- Sin symlinks; rutas con `pathlib`; archivos en UTF-8; nombres en minúsculas kebab-case.

## 9. Estructura del repo (prevista)

```
AGENTS.md  CLAUDE.md  README.md  LICENSE  mise.toml
contracts/openapi.yaml        # contrato API (fuente de verdad)
frontend/  (+ AGENTS.md)      # React + TS + Vite (propuesta)
backend/   (+ AGENTS.md)      # Python + FastAPI con uv (propuesta)
scripts/                      # utilidades multiplataforma en Python
docs/STATE.md  docs/AI_USAGE.md  docs/GLOSARIO.md  docs/fuentes/
docs/context/  docs/adr/  docs/specs/  docs/pitch/  docs/archive/
.agents/skills/  .agents/SKILLS.lock.md   (.claude/skills = copia generada)
```

Stack **recomendado** en `docs/context/06-stack-propuesto.md` (ADR 0003). Quien construya cada módulo puede elegir otro (ver §3); la estructura de carpetas se ajusta a lo que el equipo cree.

## 10. Git

- Rama por tarea: `tipo/area-descripcion-corta` (ej. `feat/viewer-blink`, `docs/context-ux`).
- Commits: Conventional Commits en inglés (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Nunca push directo a `main`; PR pequeño con la plantilla `.github/pull_request_template.md`. Un humano aprueba.
- Agentes trabajando en paralelo: un worktree o rama por agente; nunca dos agentes sobre los mismos archivos.

## 11. Al terminar cada sesión de agente

1. Actualiza `docs/STATE.md` (qué hiciste, qué falta, bloqueos) en ≤5 líneas.
2. Si se tomó una decisión: ADR nuevo en `docs/adr/` (plantilla `0000-template.md`).
3. Si usaste IA de forma relevante: una línea en `docs/AI_USAGE.md`.

## 12. Cómo explicar cosas al equipo

Somos estudiantes de Computación, no físicos. Explica física con analogías, en frases cortas, sin jerga sin definir; si usas un término nuevo, agrégalo a `docs/GLOSARIO.md`. Respuesta primero, detalle solo si lo piden.
