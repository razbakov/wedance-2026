# Design system roadmap

Status as of 2026-10-10. Base branch: `wed-ds-phase2` (tokens, font consolidation, Button fix, `/design` shell + foundations).

## Wave 1 — running in parallel (one branch + worktree each)

| # | Branch | Task | Owns |
|---|---|---|---|
| 1 | `wds-components-core` | Doc pages for Badge, Card, Dialog, Tabs, Avatar, Separator + components index; retire `/styleguide` (301 → `/design`) | `pages/design/components/*` (not button), `nuxt.config` redirect |
| 2 | `wds-button` | Brand Button variants from a survey of 269 hand-rolled buttons (cta, pill, soft, outline-pill, round icon) + Button doc page | `ui/button/*`, `pages/design/components/button.vue` |
| 3 | `wds-forms` | New components: Input, Select, Textarea, Checkbox, Label, Field + their pages + Forms pattern page | `ui/{input,select,textarea,checkbox,label,field}`, `pages/design/patterns/forms.vue` |
| 4 | `wds-foundations` | Real tokens for shadows, motion, off-scale type sizes; Spacing & Icons pages; Elevation/Motion → stable | `tailwind.css` (additive), `pages/design/foundations/*` |
| 5 | `wds-patterns` | Patterns: cards, heroes, empty states; Brand page (logo, voice, photography) | `pages/design/patterns/{cards,heroes,empty-states}`, `pages/design/brand.vue` |
| 6 | `wds-guardrails` | Token-drift ratchet test, component contract + contrast checks, visual regression, a11y scan, CI wiring | `e2e/`, tests, `package.json` scripts, CI |
| 7 | `wds-fonts` | Load Playfair once globally in `nuxt.config`, remove ~30 per-page font links | `nuxt.config` head, `useHead` font links |

Integration: merge all seven into `wed-ds-phase2`, resolve `design-nav.ts` / `tailwind.css` / `docs/design-system.md` overlaps, re-run build + vitest + visual baselines, then ship.

## Wave 2 — depends on wave 1

- Migrate the 269 raw `<button>` and 157 raw form controls onto Button / form components, page group by page group, pixel-diffed.
- Move pages from raw palette (`--wd-*`, ~2,700 uses) to semantic tokens; adopt shadow/motion/type tokens; replace inline `style=""` with utilities.
- Dark mode: decide keep or remove (currently defined but never switched on, and pages bypass the semantic layer).
- Promote one-off hex values (~30) to tokens or delete them; lower the drift-ratchet baseline to zero.
