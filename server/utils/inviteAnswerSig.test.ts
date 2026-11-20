import { describe, it, expect } from 'vitest'


process.env.OAUTH_SIGNING_SECRET = 'test-secret-for-invite-answer-emails-0123456789'

describe('answer email signature', async () => {
  const { signAnswerEmail, verifyAnswerEmail, maskEmail } = await import('./inviteAnswerSig')
  it('round-trips and expires after 7 days', () => {
    const now = Date.UTC(2026, 10, 13)
    const sig = signAnswerEmail('inv-1', 'a@b.de', now)
    expect(verifyAnswerEmail(sig, now + 6 * 24 * 3600_000)).toEqual({ inviteId: 'inv-1', email: 'a@b.de' })
    expect(verifyAnswerEmail(sig, now + 8 * 24 * 3600_000)).toBeNull()
    expect(verifyAnswerEmail(sig.slice(0, -2) + 'xx', now)).toBeNull()
  })
  it('masks the address', () => {
    expect(maskEmail('milaila@gmail.com')).toBe('mi•••@gmail.com')
  })
})
