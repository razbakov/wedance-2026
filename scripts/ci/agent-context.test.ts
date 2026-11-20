import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CURSOR_RULES_DIR, expandBraces, expectedCursorRules, SHARED_SKILLS, toCursorRule } from './agent-context'

describe('agent context for Cursor', () => {
  it('expands brace globs, which Cursor would split on their commas', () => {
    expect(expandBraces('server/{a,b}*.ts')).toEqual(['server/a*.ts', 'server/b*.ts'])
    expect(expandBraces('{x,y}/{1,2}')).toEqual(['x/1', 'x/2', 'y/1', 'y/2'])
    expect(expandBraces('app/**')).toEqual(['app/**'])
  })

  it('turns paths into globs and keeps the body', () => {
    const mdc = toCursorRule('demo', '---\npaths:\n  - "a/{b,c}.ts"\n---\n\n# Demo rule\n\nText.\n')
    expect(mdc).toContain('description: "Demo rule"\nglobs: a/b.ts,a/c.ts\nalwaysApply: false\n')
    expect(mdc.endsWith('# Demo rule\n\nText.\n')).toBe(true)
  })

  it('.cursor/rules matches .claude/rules — run `bun scripts/ci/agent-context.ts`', () => {
    const expected = expectedCursorRules()
    const actual = Object.fromEntries(
      readdirSync(CURSOR_RULES_DIR)
        .filter((f) => f.endsWith('.mdc'))
        .map((f) => [f, readFileSync(join(CURSOR_RULES_DIR, f), 'utf8')]),
    )
    expect(actual).toEqual(expected)
  })

  it('every shared skill is in .claude/skills — run `bun scripts/ci/agent-context.ts --skills`', () => {
    for (const name of Object.keys(SHARED_SKILLS)) {
      expect(existsSync(join(CURSOR_RULES_DIR, '../../.claude/skills', name, 'SKILL.md')), name).toBe(true)
    }
  })
})
