import { z } from 'zod'

/**
 * "Talk to us" fallback: when the report can't reach Sentry (even through our
 * relay), the widget posts it to server/api/report.post.ts, which files it as
 * a Linear triage issue so no report is lost. No screenshot here — too big for
 * an issue body; the PostHog replay link covers it.
 */

const short = (n: number) => z.string().max(n).optional().nullable()

export const ReportFallbackInput = z.object({
  type: z.enum(['bug', 'idea']),
  description: z.string().trim().min(1).max(5000),
  email: z.string().email().max(320).optional().nullable().or(z.literal('')),
  name: short(160),
  // Sent by the browser, not checked against a session: for triage only.
  dancerId: short(64),
  username: short(64),
  sentryError: short(500),
  context: z.object({
    url: short(2000),
    userAgent: short(500),
    viewport: short(40),
    screen: short(40),
    language: short(40),
    timezone: short(80),
    appVersion: short(80),
    consoleErrors: z.array(z.string().max(500)).max(20).optional(),
    sentryReplayUrl: short(500),
    posthogSessionUrl: short(500),
  }).partial().default({}),
})

export type ReportFallback = z.infer<typeof ReportFallbackInput>

/** Pure: the Linear issue for a fallback report (unit-tested). */
export function fallbackIssue(r: ReportFallback): { title: string, description: string } {
  const icon = r.type === 'bug' ? '🐞' : '💡'
  const firstLine = r.description.split('\n')[0]!.trim()
  const title = `${icon} ${firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine}`
  const c = r.context
  const lines = [
    r.description,
    '',
    '---',
    `**Type:** ${r.type}`,
  ]
  if (r.name) lines.push(`**Name:** ${r.name}`)
  if (r.email) lines.push(`**Email:** ${r.email}`)
  if (r.username || r.dancerId) lines.push(`**Account (as sent by the browser):** ${r.username ? `@${r.username}` : ''} ${r.dancerId ? `\`${r.dancerId}\`` : ''}`.trim())
  if (c.url) lines.push(`**Page:** ${c.url}`)
  if (c.userAgent) lines.push(`**Browser:** ${c.userAgent}`)
  const device = [c.viewport && `viewport ${c.viewport}`, c.screen && `screen ${c.screen}`, c.language, c.timezone].filter(Boolean)
  if (device.length) lines.push(`**Device:** ${device.join(' · ')}`)
  if (c.appVersion) lines.push(`**Build:** ${c.appVersion}`)
  if (c.posthogSessionUrl) lines.push(`**PostHog replay:** ${c.posthogSessionUrl}`)
  if (c.sentryReplayUrl) lines.push(`**Sentry replay:** ${c.sentryReplayUrl}`)
  if (c.consoleErrors?.length) lines.push('', '**Console errors:**', '```', ...c.consoleErrors, '```')
  lines.push('', `_Filed by the "Talk to us" fallback — Sentry was unreachable${r.sentryError ? ` (${r.sentryError})` : ''}._`)
  return { title, description: lines.join('\n') }
}
