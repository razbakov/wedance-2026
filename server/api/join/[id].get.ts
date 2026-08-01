/**
 * GET /api/join/[id] — PUBLIC board feed. No secret required.
 *
 * Returns a safe projection { id, name, level, quest, accessGranted } — it
 * NEVER exposes email or telegramId (see toSafeCandidate). This is what the
 * public /join/[id] game board renders.
 */
import { useDb } from '../../utils/db'
import { getCandidate, toSafeCandidate } from './onboarding.lib'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'id_required' } })
  }

  const candidate = await getCandidate(useDb(), id)
  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { error: 'candidate_not_found' } })
  }

  return toSafeCandidate(candidate)
})
