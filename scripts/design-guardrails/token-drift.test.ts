/**
 * Design-system drift guardrail. Fast, static, runs in the `unit` CI job.
 * Rules + how to fix a failure: docs/design-system.md → "Guardrails".
 */
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_GOOGLE_FAMILIES,
  findQuotedFontLists,
  readBaseline,
  scanFontFamily,
  scanGoogleFonts,
  scanHex,
  scanQuotedFontLists,
} from './scan'

const DOCS = 'docs/design-system.md → "Guardrails"'
const UPDATE = 'bun scripts/design-guardrails/update-baseline.ts'

function fmt(hits: { file: string, line: number, text: string }[]) {
  return hits.map(h => `  ${h.file}:${h.line}  ${h.text}`).join('\n')
}

describe('design tokens: no drift', () => {
  const baseline = readBaseline()

  it('literal hex colours in app/ do not grow (ratchet)', () => {
    const { perFile, hits, total } = scanHex()
    const grown = Object.entries(perFile)
      .filter(([f, n]) => n > (baseline.hex.perFile[f] ?? 0))
      .map(([f, n]) => {
        const was = baseline.hex.perFile[f] ?? 0
        return `${f}: ${was} → ${n}\n${fmt(hits.filter(h => h.file === f))}`
      })

    if (grown.length) {
      throw new Error(
        `New literal hex colour(s) in app/. Use a token instead:\n`
        + `  CSS → var(--wd-*) / bg-wd-* / semantic class;  JS → WD.* from ~/lib/brand;  alpha → color-mix(...)\n`
        + `  No token fits? Add one to tailwind.css + brand.ts in a design-system PR.\n`
        + `See ${DOCS}.\n\n${grown.join('\n\n')}`,
      )
    }

    if (total < baseline.hex.total) {
      // Not a failure — parallel cleanups shouldn't break each other's CI — but nudge.
      console.info(`[design] hex literals ${baseline.hex.total} → ${total}. Lock in the win: ${UPDATE}`)
    }
    expect(total).toBeLessThanOrEqual(baseline.hex.total)
  })

  it('inline font-family is always var(--wd-font-*)', () => {
    const { perFile, hits } = scanFontFamily()
    const bad = hits.filter(h => (perFile[h.file] ?? 0) > (baseline.fontFamily.perFile[h.file] ?? 0))
    expect(bad, `Literal font-family found. Use font-display / font-sans classes or var(--wd-font-display|sans). See ${DOCS}.\n${fmt(bad)}`).toEqual([])
  })

  it(`Google Fonts loads only ${ALLOWED_GOOGLE_FAMILIES.join(', ')}`, () => {
    const bad = scanGoogleFonts()
    expect(bad, `Unapproved Google Font family. The system has one display face (Playfair Display); adding a font needs a design-system PR. See ${DOCS}.\n${fmt(bad)}`).toEqual([])
  })

  it('font tokens never quote a comma list as one family name', () => {
    const bad = scanQuotedFontLists()
    expect(bad, `Quoted font list ("'Caveat, cursive'" is ONE family named "Caveat, cursive" and never matches). Quote each name: 'Playfair Display', serif. See ${DOCS}.\n${fmt(bad)}`).toEqual([])
  })
})

describe('design-guardrail scanner self-test', () => {
  it('detects a quoted comma list and accepts a correct stack', () => {
    expect(findQuotedFontLists(`:root{ --wd-font-hand: 'Caveat, cursive'; }`)).toHaveLength(1)
    expect(findQuotedFontLists(`.x{ font-family: "Anton, sans-serif"; }`)).toHaveLength(1)
    expect(findQuotedFontLists(`:root{ --wd-font-display: 'Playfair Display', serif; }`)).toHaveLength(0)
  })
})
