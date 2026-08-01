/**
 * POST /api/join/[id]/advance — record a progression event (secret-guarded).
 *
 * Body: { event: string, level?: number, data?: object }
 * Appends { event, at, data? } to the candidate's history, optionally sets the
 * level, bumps updatedAt. Returns the updated candidate.
 */
import { useDb } from '../../../utils/db'
import { checkSecret, recordAdvance } from '../onboarding.lib'

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
  if (!eventName) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'event_required' } })
  }

  const updated = await recordAdvance(useDb(), id, {
    event: eventName,
    level: typeof body?.level === 'number' ? body.level : undefined,
    data: body?.data && typeof body.data === 'object' ? body.data : undefined,
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { error: 'candidate_not_found' } })
  }

  return updated
})
