# Skills lock (vendored, pinned)

Skills are copied into `.agents/skills/` at a pinned upstream commit so every teammate and every tool uses the same version. **Do not update a skill without reading its diff** (SKILL.md + scripts): third-party skills are a supply-chain risk (Snyk ToxicSkills 2026: 13.4% of audited skills had critical issues). Copied 2026-11-14; all scripts grep-audited for network installs, `sudo`, permission-bypass flags and prompt-injection phrases.

| Skill | Upstream | Commit | Commit date | License |
| --- | --- | --- | --- | --- |
| frontend-design | anthropics/skills `skills/frontend-design` | 1780c5e5a5 | 2026-11-14 | Apache-2.0 (LICENSE.txt in folder) |
| impeccable | pbakaus/impeccable `plugin/skills/impeccable` | 1995764b49 | 2026-11-14 | Apache-2.0 |
| web-design-guidelines | vercel-labs/agent-skills `skills/web-design-guidelines` + vercel-labs/web-interface-guidelines `command.md` → `guidelines.md` | 1a2c79d4e6 / 434b7f9136 | 2026-10-27 | MIT |
| vercel-react-best-practices | vercel-labs/agent-skills `skills/react-best-practices` | 1a2c79d4e6 | 2026-10-27 | MIT |
| vercel-composition-patterns | vercel-labs/agent-skills `skills/composition-patterns` | 1a2c79d4e6 | 2026-10-27 | MIT |
| accessibility | addyosmani/web-quality-skills `skills/accessibility` | afa8da9421 | 2026-08-24 | MIT |
| playwright-cli | microsoft/playwright-cli `skills/playwright-cli` | b21724888b | 2026-11-11 | Apache-2.0 |
| modern-python | trailofbits/skills `plugins/modern-python/...` | 149d7b21f4 | 2026-11-12 | CC BY-SA 4.0 |
| differential-review | trailofbits/skills `plugins/differential-review/...` | 149d7b21f4 | 2026-11-12 | CC BY-SA 4.0 |
| brainstorming, writing-plans, systematic-debugging, verification-before-completion, test-driven-development | obra/superpowers `skills/*` | 22f0b463e7 | 2026-11-03 | MIT |
| scientific-charts | **this repo** (team-authored) | — | 2026-11-14 | MIT |

Local modifications:
- `web-design-guidelines/SKILL.md`: reads the vendored `guidelines.md` instead of fetching a URL at runtime.
- `vercel-react-best-practices/AGENTS.md` removed (would be picked up as nested agent instructions).

License texts: `.agents/licenses/`.

Rejected after research (see `docs/context/05-estandares-agentes.md` §3): ui-ux-pro-max, design-taste-frontend, anti-ui-slop, no-slop-ui, webapp-testing (replaced by playwright-cli), gstack, api-design-principles.
