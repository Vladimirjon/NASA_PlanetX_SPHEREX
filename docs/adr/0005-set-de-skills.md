# 0005 · Set de skills por evidencia, fijadas en el repo

- Estado: **recomendación** (set por defecto; cada persona puede usar otras skills revisando antes su código)
- Fecha: 2026-11-14
- Decidido por: Dax

## Contexto
Las skills populares no siempre son buenas (ui-ux-pro-max: issues abiertos que degradan el diseño, auditoría de seguridad 24/100). Las skills de terceros son un riesgo de cadena de suministro. Un symlink `.claude/skills` falla en Windows.

## Decisión
15 skills elegidas por evidencia (comparativas, issues, auditorías), copiadas en `.agents/skills/` con commit fijado en `.agents/SKILLS.lock.md`. `.claude/skills` es una copia generada por `scripts/sync_skills.py`. Las reglas críticas también van en AGENTS.md, porque los agentes no invocan la skill en ~56 % de los casos (eval de Vercel).

## Consecuencias
Actualizar una skill requiere leer su diff. Descartadas: ui-ux-pro-max, design-taste-frontend, anti-ui-slop, no-slop-ui, webapp-testing, gstack, api-design-principles.
