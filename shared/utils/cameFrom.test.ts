import { describe, it, expect } from 'vitest'
import { cameFromInput, cameFromLanding, cleanCameFrom, outsideReferrer } from './cameFrom'

const HOST = '2026.wedance.vip'

describe('cameFrom (RAZ-1074)', () => {
  it('reads utm_* and the outside referrer of a landing', () => {
    expect(cameFromLanding({ utm_source: 'montuno.club', utm_medium: 'schedule', other: 'x' }, 'https://montuno.club/', HOST))
      .toEqual({ utm_source: 'montuno.club', utm_medium: 'schedule', referrer: 'https://montuno.club/' })
  })

  it('tells nothing for a direct visit or our own pages', () => {
    expect(cameFromLanding({}, '', HOST)).toBeNull()
    expect(cameFromLanding({}, 'https://2026.wedance.vip/events', HOST)).toBeNull()
  })

  it('cuts the referrer to origin + path, never its query', () => {
    expect(outsideReferrer('https://l.instagram.com/path?u=secret&e=me@x.de', HOST)).toBe('https://l.instagram.com/path')
    expect(outsideReferrer('not a url', HOST)).toBe('')
    expect(outsideReferrer('android-app://com.whatsapp', HOST)).toBe('')
  })

  it('keeps only the known keys', () => {
    expect(cleanCameFrom({ utm_source: ' ig ', from: 'rsvp', opted_in: 'yes', referrer: '' })).toEqual({ utm_source: 'ig' })
    expect(cleanCameFrom(null)).toEqual({})
    expect(cameFromInput.safeParse({ from: 'rsvp' }).success).toBe(false)
  })
})
