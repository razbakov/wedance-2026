import { signPayload, verifyPayload } from '../oauth/crypto'

/** "mi•••@gmail.com" */
export const maskEmail = (e: string) => { const [u = '', d = ''] = e.split('@'); return `${u.slice(0, 2)}•••@${d}` }

// "That's me" in the answer email: proves the answerer owns the address they left.
const ANSWER_PURPOSE = 'invite-answer-email'
const ANSWER_TTL = 7 * 24 * 3600
export const signAnswerEmail = (inviteId: string, email: string, now = Date.now()) => signPayload(ANSWER_PURPOSE, { i: inviteId, e: email }, ANSWER_TTL, now)
export function verifyAnswerEmail(sig: string | null | undefined, now = Date.now()) {
  const v = verifyPayload<{ i: string; e: string }>(ANSWER_PURPOSE, sig, now)
  return v && v.i && v.e ? { inviteId: v.i, email: v.e } : null
}

