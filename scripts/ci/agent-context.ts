// Keeps the agent context in the repo readable by every coding agent, so cloud agents
// (Cursor from Linear, Claude Code on the web) get the same rules as a local session.
//
//   bun scripts/ci/agent-context.ts            regenerate .cursor/rules/*.mdc from .claude/rules/*.md
//   bun scripts/ci/agent-context.ts --skills   also copy the shared skills into .claude/skills/
//
// .claude/rules is the source. Cursor reads only .cursor/rules/*.mdc, with `globs:` instead of
// `paths:` and no brace patterns (it splits globs on commas), so braces are expanded here.
// agent-context.test.ts fails the `unit` job when the generated files are stale.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

const ROOT = resolve(import.meta.dirname, '../..')
export const RULES_DIR = join(ROOT, '.claude/rules')
export const CURSOR_RULES_DIR = join(ROOT, '.cursor/rules')
const SKILLS_DIR = join(ROOT, '.claude/skills')

// Shared skills copied into the repo: name → source repo. Edit them at the source, never here.
export const SHARED_SKILLS: Record<string, string> = {
  'linear-issue': 'skills@razbakov',
  'ui-variants': 'skills@razbakov',
  'test-driven-development': 'superpowers@obra',
}
const SKILL_SOURCES = process.env.SKILL_SOURCES ?? join(homedir(), '.local/share/skill-mix/sources')

/** `a/{b,c}*.ts` → `a/b*.ts`, `a/c*.ts` (also several and nested groups). */
export function expandBraces(glob: string): string[] {
  const open = glob.indexOf('{')
  if (open < 0) return [glob]
  let depth = 0
  for (let i = open; i < glob.length; i++) {
    if (glob[i] === '{') depth++
    else if (glob[i] === '}' && --depth === 0) {
      const parts: string[] = []
      let d = 0
      let start = open + 1
      for (let j = open + 1; j < i; j++) {
        if (glob[j] === '{') d++
        else if (glob[j] === '}') d--
        else if (glob[j] === ',' && d === 0) {
          parts.push(glob.slice(start, j))
          start = j + 1
        }
      }
      parts.push(glob.slice(start, i))
      const head = glob.slice(0, open)
      const tail = glob.slice(i + 1)
      return parts.flatMap((p) => expandBraces(head + p + tail))
    }
  }
  return [glob]
}

/** One .claude/rules file → the matching .cursor/rules .mdc content. */
export function toCursorRule(name: string, source: string): string {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const front = m ? (parse(m[1]!) ?? {}) : {}
  const body = (m ? m[2]! : source).replace(/^\n+/, '')
  const paths: string[] = Array.isArray(front.paths) ? front.paths : []
  const globs = [...new Set(paths.flatMap(expandBraces))]
  const heading = body.match(/^#+\s+(.+)$/m)?.[1]?.trim() ?? name
  const lines = [
    '---',
    `description: ${JSON.stringify(heading)}`,
    `globs: ${globs.join(',')}`,
    `alwaysApply: ${globs.length === 0}`,
    '---',
    `<!-- Generated from .claude/rules/${name}.md by scripts/ci/agent-context.ts. Edit the source, not this file. -->`,
    '',
  ]
  return lines.join('\n') + body
}

/** Every .mdc file that should exist, by file name. */
export function expectedCursorRules(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const file of readdirSync(RULES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const name = file.replace(/\.md$/, '')
    out[`${name}.mdc`] = toCursorRule(name, readFileSync(join(RULES_DIR, file), 'utf8'))
  }
  return out
}

function writeCursorRules() {
  mkdirSync(CURSOR_RULES_DIR, { recursive: true })
  const expected = expectedCursorRules()
  for (const f of readdirSync(CURSOR_RULES_DIR)) {
    if (f.endsWith('.mdc') && !(f in expected)) rmSync(join(CURSOR_RULES_DIR, f))
  }
  for (const [f, content] of Object.entries(expected)) writeFileSync(join(CURSOR_RULES_DIR, f), content)
  console.log(`.cursor/rules: ${Object.keys(expected).length} rules written`)
}

function copySkills() {
  for (const [name, source] of Object.entries(SHARED_SKILLS)) {
    const from = join(SKILL_SOURCES, source, 'skills', name)
    if (!existsSync(join(from, 'SKILL.md'))) {
      console.error(`skip ${name}: no ${from}/SKILL.md (set SKILL_SOURCES to the skill-mix sources folder)`)
      process.exitCode = 1
      continue
    }
    const to = join(SKILLS_DIR, name)
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true, filter: (p) => !p.split('/').includes('.git') })
    console.log(`.claude/skills/${name} ← ${source}`)
  }
}

if (import.meta.main) {
  writeCursorRules()
  if (process.argv.includes('--skills')) copySkills()
}
