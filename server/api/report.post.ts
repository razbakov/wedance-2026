import { useDb } from '../utils/db'
import { hit, ipKey } from '../oauth/rateLimit'
import { fallbackIssue, ReportFallbackInput } from '../utils/reportFallback'
import { fileTriageIssue } from '../trpc/routers/feedback'

/** "Talk to us" fallback when Sentry is unreachable (server/utils/reportFallback.ts). */
const LIMIT = { limit: 5, windowS: 600 }

export default defineEventHandler(async (event) => {
  const parsed = ReportFallbackInput.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid report' })

  const ip = getRequestIP(event, { xForwardedFor: true })
  const rl = await hit(useDb(), ipKey('report', ip), LIMIT)
  if (!rl.ok) {
    setResponseHeader(event, 'Retry-After', String(rl.retryAfter))
    throw createError({ statusCode: 429, statusMessage: 'Too many reports' })
  }

  const { title, description } = fallbackIssue(parsed.data)
  try {
    const id = await fileTriageIssue(title, description, parsed.data.type === 'bug' ? 2 : 3)
    return { id }
  } catch (e) {
    console.error('[report] fallback failed:', e)
    throw createError({ statusCode: 502, statusMessage: 'Could not file the report' })
  }
})
