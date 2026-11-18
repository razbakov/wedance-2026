# Skills

Claude Code and Cursor (which also reads `.claude/skills/` for compatibility) load the skills in this folder,
including cloud agents, which see only the repo.

- `hi` — this project's own skill. Edit it here.
- `linear-issue`, `ui-variants` — copies from [razbakov/skills](https://github.com/razbakov/skills).
- `test-driven-development` — copy from [obra/superpowers](https://github.com/obra/superpowers) (MIT, © Jesse Vincent).

Don't edit the copies here. Change them at the source, then run `bun scripts/ci/agent-context.ts --skills`.
The list of copied skills is `SHARED_SKILLS` in `scripts/ci/agent-context.ts`.
