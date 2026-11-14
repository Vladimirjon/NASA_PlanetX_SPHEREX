## What / Qué
<!-- 1–3 lines -->

## Why / Por qué
<!-- Link to spec, ADR or STATE item -->

## Evidence / Evidencia (required)
- [ ] Tests: <!-- paste command + output summary -->
- [ ] Lint / typecheck: <!-- output -->
- [ ] Build: <!-- output -->
- [ ] UI changes: screenshot(s) attached (desktop + mobile, light + projector)

## Checklist
- [ ] Contract-first: `contracts/openapi.yaml` updated before code (if API changed)
- [ ] No secrets, no `any`/`except: pass`, inputs validated at the edge
- [ ] Real data only; scientific claims cited or marked `[VERIFICAR]`
- [ ] `docs/STATE.md` updated; ADR added if a decision was made
- [ ] AI use logged in `docs/AI_USAGE.md` (if relevant)
- [ ] New dependency? Justified here: <!-- -->
