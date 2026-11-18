import { describe, it, expect } from 'vitest'
import { matchEmailBlock } from './meetMatchNotify'

const now = new Date('2026-11-17T12:00:00Z')
const ok = {
  recipient: { email: 'gila@example.com', matchEmails: true },
  other: { photo: 'https://example.com/me.jpg', profilePublic: true },
  alreadySentForPair: false,
  lastSentAt: null,
  now,
}

describe('matchEmailBlock', () => {
  it('sends when nothing stands in the way', () => {
    expect(matchEmailBlock(ok)).toBeNull()
  })
  it('respects the opt-out', () => {
    expect(matchEmailBlock({ ...ok, recipient: { email: 'g@x.com', matchEmails: false } })).toBe('off')
  })
  it('never about someone the recipient could not see (private or no photo)', () => {
    expect(matchEmailBlock({ ...ok, other: { photo: null, profilePublic: true } })).toBe('not_shown')
    expect(matchEmailBlock({ ...ok, other: { photo: 'x', profilePublic: false } })).toBe('not_shown')
  })
  it('once per pair', () => {
    expect(matchEmailBlock({ ...ok, alreadySentForPair: true })).toBe('already')
  })
  it('at most one a day per recipient', () => {
    expect(matchEmailBlock({ ...ok, lastSentAt: new Date(now.getTime() - 3600_000) })).toBe('today')
    expect(matchEmailBlock({ ...ok, lastSentAt: new Date(now.getTime() - 25 * 3600_000) })).toBeNull()
  })
  it('needs an address', () => {
    expect(matchEmailBlock({ ...ok, recipient: { email: '', matchEmails: true } })).toBe('no_email')
  })
})
