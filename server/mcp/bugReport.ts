/**
 * A bug report filed from MCP. Arguments often repeat the previous tool call,
 * which can hold a password, a token, an email or a phone. Those never go
 * into the Linear issue. The reporter's own reply address is kept only when
 * they passed it on purpose, and only after they confirm the preview.
 */

export const SUPPORT_PROJECT_ID = 'ff24241d-28fe-4f2e-92c2-b220340dbe18'
export const SUPPORT_EMAIL = 'hello@wedance.vip'

export interface BugReportInput {
  message: string
  tool?: string | null
  error?: string | null
  arguments?: unknown
  contactEmail?: string | null
}

export interface RedactedBugReport {
  message: string
  tool: string | null
  error: string | null
  arguments: Record<string, unknown> | null
  contactEmail: string | null
}

const SECRET_KEY = /email|e-mail|phone|mobile|password|passwd|secret|token|authorization|cookie|credential|api[-_]?key/i
const emailRe = () => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const bearerRe = () => /Bearer\s+\S+/gi
const secretTokenRe = () => /\b(?:sk|pk|rk|ghp|gho|github_pat|xox[baprs])-[A-Za-z0-9_-]{8,}\b/g
const phoneRe = () => /(?:\+|00)\d[\d\s().-]{6,}\d/g
const MAX_DEPTH = 8
const MAX_KEYS = 40
const MAX_ITEMS = 50
const MAX_STRING = 500
const MAX_ARGS = 6000

function redactPhones(s: string): string {
  return s.replace(phoneRe(), (m) => {
    const digits = m.replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15 ? '[redacted phone]' : m
  })
}

export function redactText(s: string): string {
  const out = redactPhones(
    s.replace(emailRe(), '[redacted email]').replace(bearerRe(), '[redacted token]').replace(secretTokenRe(), '[redacted secret]'),
  )
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…` : out
}

function redactValue(value: unknown, key: string | null, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[…]'
  if (key && SECRET_KEY.test(key)) return '[redacted]'
  if (typeof value === 'string') return redactText(value)
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return value
  if (Array.isArray(value)) return value.slice(0, MAX_ITEMS).map(v => redactValue(v, null, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) out[k] = redactValue(v, k, depth + 1)
    return out
  }
  return null
}

function asArgs(value: unknown): Record<string, unknown> | null {
  const redacted = redactValue(value, null, 0)
  if (!redacted || typeof redacted !== 'object' || Array.isArray(redacted)) return null
  const json = JSON.stringify(redacted)
  if (json.length > MAX_ARGS) return { _note: 'Arguments were too large; only what happened and the error were kept.' }
  return redacted as Record<string, unknown>
}

export function redactBugReport(input: BugReportInput): RedactedBugReport {
  const contact = typeof input.contactEmail === 'string' && emailRe().test(input.contactEmail.trim()) ? input.contactEmail.trim() : null
  return {
    message: redactText(input.message ?? ''),
    tool: input.tool?.trim() ? input.tool.trim().slice(0, 80) : null,
    error: input.error?.trim() ? redactText(input.error) : null,
    arguments: input.arguments == null ? null : asArgs(input.arguments),
    contactEmail: contact,
  }
}

export function buildBugIssue(r: RedactedBugReport & { reporter: string | null; clientApp: string | null }): { title: string; description: string; projectId: string } {
  const line = r.message.replace(/\s+/g, ' ').trim()
  const title = `🐞 ${line.length > 80 ? `${line.slice(0, 79)}…` : line}`
  const lines = ['**What happened:**', r.message, '']
  if (r.tool) lines.push(`**Tool:** ${r.tool}`)
  if (r.error) lines.push(`**Error:**`, r.error, '')
  if (r.arguments) lines.push('**Arguments:**', '```json', JSON.stringify(r.arguments, null, 2), '```', '')
  if (r.reporter) lines.push(`**Reporter:** @${r.reporter.replace(/^@/, '')}`)
  if (r.contactEmail) lines.push(`**Reply to:** ${r.contactEmail}`)
  if (r.clientApp) lines.push(`**App:** ${r.clientApp}`)
  lines.push('', `_Filed from the report_bug tool on the WeDance MCP server. On the site, use Report a problem or email ${SUPPORT_EMAIL}._`)
  return { title, description: lines.join('\n'), projectId: SUPPORT_PROJECT_ID }
}
