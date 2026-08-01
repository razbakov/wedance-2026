/**
 * POST /api/join/[id]/cuj — set a single CUJ event's status (secret-guarded).
 *
 * Body: { event, status: 'green' | 'red' }
 * Sets quest.cuj_events[event] = status, bumps updatedAt. When all 13 CUJ
 * events are green, the candidate is promoted to level 4. Returns the updated
 * candidate plus a boolean `allGreen`.
 */
import { useDb } from '../../../utils/db'
import { checkSecret, recordCuj, CUJ_EVENTS } from '../onboarding.lib'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const provided = getHeader(event, 'x-onboarding-secret') || ''
  if (!checkSecret(provided, config.onboardingApiSecret as string)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', data: { error: 'invalid_secret' } })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'id_required' } })
  }

  const body = await readBody(event)
  const eventName = typeof body?.event === 'string' ? body.event.trim() : ''
  const status = body?.status
  if (!eventName || !(CUJ_EVENTS as readonly string[]).includes(eventName)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'invalid_event' } })
  }
  if (status !== 'green' && status !== 'red') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'invalid_status' } })
  }

  const result = await recordCuj(useDb(), id, { event: eventName, status })
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { error: 'candidate_not_found' } })
  }

  return { ...result.candidate, allGreen: result.allGreen }
})
