/**
 * Rewrite scripts/design-guardrails/baseline.json from the current tree.
 *
 *   bun scripts/design-guardrails/update-baseline.ts            # lower only (the normal case)
 *   bun scripts/design-guardrails/update-baseline.ts --allow-increase
 *
 * Without --allow-increase it refuses to raise any number: the baseline is a
 * ratchet. Raising it is a design-system decision — say why in the PR.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { BASELINE_PATH, currentBaseline, readBaseline } from './scan'

const next = currentBaseline()
const allowIncrease = process.argv.includes('--allow-increase')

if (existsSync(BASELINE_PATH) && !allowIncrease) {
  const prev = readBaseline()
  const grew: string[] = []
  for (const [f, n] of Object.entries(next.hex.perFile))
    if (n > (prev.hex.perFile[f] ?? 0)) grew.push(`hex  ${f}: ${prev.hex.perFile[f] ?? 0} → ${n}`)
  for (const [f, n] of Object.entries(next.fontFamily.perFile))
    if (n > (prev.fontFamily.perFile[f] ?? 0)) grew.push(`font ${f}: ${prev.fontFamily.perFile[f] ?? 0} → ${n}`)
  if (grew.length) {
    console.error(`Refusing to raise the design baseline:\n  ${grew.join('\n  ')}\nUse a token instead (docs/design-system.md), or pass --allow-increase and justify it in the PR.`)
    process.exit(1)
  }
}

writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`)
console.log(`baseline.json: ${next.hex.total} hex literals in ${Object.keys(next.hex.perFile).length} files; ${Object.values(next.fontFamily.perFile).reduce((a, b) => a + b, 0)} literal font-family.`)
