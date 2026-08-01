/**
 * POST /api/join/candidates — create an onboarding candidate (secret-guarded).
 *
 * Body: { name, email?, telegramId?, role }
 * Auth: `x-onboarding-secret` header, compared with timingSafeEqual. Fails
 *       closed 401 when the secret is unset or mismatched.
 * Returns: 201 { id, level, quest, accessGranted }
 *
 * Bulk of the logic is in ./onboarding.lib so it can be unit-tested without
 * booting Nitro.
 */
import { useDb } from '../../utils/db'
import { checkSecret, createCandidate } from './onboarding.lib'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const provided = getHeader(event, 'x-onboarding-secret') || ''
  if (!checkSecret(provided, config.onboardingApiSecret as string)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', data: { error: 'invalid_secret' } })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { error: 'name_required' } })
  }

  const candidate = await createCandidate(useDb(), {
    name,
    email: typeof body?.email === 'string' ? body.email.trim() : null,
    telegramId: body?.telegramId != null ? String(body.telegramId) : null,
    role: typeof body?.role === 'string' ? body.role.trim() : null,
  })

  setResponseStatus(event, 201)
  return {
    id: candidate.id,
    level: candidate.level,
    quest: candidate.quest,
    accessGranted: candidate.accessGranted,
  }
})
