import { describe, expect, it } from 'vitest'
import {
  SHORTLIST_NOTE_MAX,
  SHORTLIST_OCCASIONS,
  parseNote,
  parseOccasion,
  shortlistBoard,
} from './artistShortlist'

describe('artist shortlist', () => {
  it('accepts a wedding, birthday, corporate event or other, and an empty tag', () => {
    expect(SHORTLIST_OCCASIONS).toEqual(['wedding', 'birthday', 'corporate', 'other'])
    expect(parseOccasion('wedding')).toBe('wedding')
    expect(parseOccasion('')).toBeNull()
    expect(parseOccasion(null)).toBeNull()
  })

  it('rejects a tag that is not one of those occasions', () => {
    expect(() => parseOccasion('festival')).toThrow(/wedding, birthday, corporate/)
    expect(() => parseOccasion('follow')).toThrow(/wedding, birthday, corporate/)
  })

  it('keeps a private note and drops a blank one', () => {
    expect(parseNote('  Ask about travel  ')).toBe('Ask about travel')
    expect(parseNote('   ')).toBeNull()
    expect(parseNote(null)).toBeNull()
  })

  it('refuses a note longer than 500 characters', () => {
    expect(SHORTLIST_NOTE_MAX).toBe(500)
    expect(() => parseNote('a'.repeat(SHORTLIST_NOTE_MAX + 1))).toThrow(/500/)
    expect(parseNote('a'.repeat(SHORTLIST_NOTE_MAX))).toBe('a'.repeat(SHORTLIST_NOTE_MAX))
  })

  it('shows one occasion, newest shortlist first', () => {
    const rows = [
      { username: 'older', occasion: 'wedding' as const, createdAt: '2026-11-01T00:00:00.000Z' },
      { username: 'newer', occasion: 'wedding' as const, createdAt: '2026-11-20T00:00:00.000Z' },
      { username: 'party', occasion: 'birthday' as const, createdAt: '2026-11-25T00:00:00.000Z' },
    ]
    expect(shortlistBoard(rows, 'wedding').map(r => r.username)).toEqual(['newer', 'older'])
    expect(shortlistBoard(rows, 'all').map(r => r.username)).toEqual(['party', 'newer', 'older'])
  })
})
