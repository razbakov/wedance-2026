import { describe, expect, it } from 'vitest'
import { eventLocalTime, zonedToUtc } from './eventTime'
import {
  givenName,
  followupDue,
  markPhrase,
  meetupAt,
  meetupClock,
  nightCopy,
  pairMark,
  ritualEmailBlock,
  ritualFollowup,
  type RitualFacts,
} from './ritual'

const FACTS: RitualFacts = {
  you: 'Lena',
  other: 'Mary',
  event: 'Salsa Night',
  venue: 'La Timberia',
  time: '23:15',
  weekday: 'Thursday',
}

describe('pairMark', () => {
  it('is the same symbol for both dancers', () => {
    const a = pairMark('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'event-1')
    const b = pairMark('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'event-1')
    expect(b).toEqual(a)
    expect(a.number).toBeGreaterThanOrEqual(10)
    expect(a.number).toBeLessThanOrEqual(99)
    expect(a.code).toMatch(/^[A-HJ-NP-Z]\d$/)
  })

  it('changes with a different pair or a different event', () => {
    const a = pairMark('a', 'b', 'event-1')
    const otherPair = pairMark('a', 'c', 'event-1')
    const otherEvent = pairMark('a', 'b', 'event-2')
    expect(otherPair).not.toEqual(a)
    expect(otherEvent).not.toEqual(a)
  })

  it('names the symbol without saying who to look for', () => {
    const mark = pairMark('a', 'b', 'event-1')
    expect(markPhrase(mark)).toBe(`${mark.colorName} ${mark.shapeName} ${mark.number}`)
    expect(markPhrase(mark).toLowerCase()).not.toContain('mary')
  })
})

describe('meetupAt', () => {
  it('uses 23:15 when that time is during the night', () => {
    const start = zonedToUtc('2026-11-19', '21:30', 'Europe/Berlin')
    const end = zonedToUtc('2026-11-20', '02:00', 'Europe/Berlin')
    expect(eventLocalTime(meetupAt(start, end, 'Europe/Berlin'), 'Europe/Berlin')).toBe('23:15')
    expect(meetupClock(start, end, 'Europe/Berlin')).toBe('23:15')
  })

  it('meets a little after the start when the night ends before 23:15', () => {
    const start = zonedToUtc('2026-11-19', '19:00', 'Europe/Berlin')
    const end = zonedToUtc('2026-11-19', '20:30', 'Europe/Berlin')
    expect(eventLocalTime(meetupAt(start, end, 'Europe/Berlin'), 'Europe/Berlin')).toBe('19:30')
  })

  it('meets after a late start instead of a 23:15 that already passed', () => {
    const start = zonedToUtc('2026-11-19', '23:30', 'Europe/Berlin')
    const end = zonedToUtc('2026-11-20', '03:00', 'Europe/Berlin')
    expect(eventLocalTime(meetupAt(start, end, 'Europe/Berlin'), 'Europe/Berlin')).toBe('01:00')
  })
})

describe('night copy', () => {
  it('is English, explains the turn, and speaks the reassurances in the first person', () => {
    const copy = nightCopy({ ...FACTS, eventStart: '20:00' })
    expect(copy.nextBody).toContain('Mary')
    expect(copy.nextBody).toContain('turn your phone toward Mary')
    expect(copy.nextBody).toContain('color, shape and number')
    expect(copy.showThem).toBe('Open the screen to turn toward Mary')
    expect(copy.findLine).toBe('Find the phone showing the same color, shape and number.')
    expect(copy.findLine).not.toContain('Lena')
    expect(copy.safetyLeave).toBe('I can leave any time')
    expect(copy.safetyPublic).toBe('I’m meeting in a public spot')
    expect(copy.safetyAdult).toBe('I’m 18+')
    expect(copy.timeWhy).toContain('starts at 20:00')
    expect(copy.timeWhy).toContain('23:15')
    expect(copy.problems.report_person).toBe('Report someone')
    expect(copy.help).toBe('Couldn’t meet?')
    expect(copy.place).toBe('near the DJ booth')
    const text = JSON.stringify(copy)
    expect(text).not.toMatch(/Zurück|Grün|Handy|Sicherheit|geklappt/)
  })

  it('does not suggest following until the morning-after lines', () => {
    const copy = nightCopy(FACTS)
    const night = Object.entries(copy)
      .filter(([key]) => key !== 'follow' && key !== 'following')
      .map(([, value]) => typeof value === 'string' ? value : Object.values(value).join(' '))
      .join('\n')
    expect(night.toLowerCase()).not.toContain('follow')
    expect(copy.follow).toBe('Follow Mary')
  })
})

describe('ritualFollowup', () => {
  it('asks how it was and only then suggests a follow', () => {
    const email = ritualFollowup(FACTS, 'https://2026.wedance.vip/meet/ritual?with=mary&morning=1', 'https://2026.wedance.vip/off')
    expect(email.subject).toBe('How was it with Mary?')
    expect(email.text).toContain('follow')
    expect(email.text).toContain('morning=1')
    expect(email.html).toContain('How was it?')
    expect(email.html).toContain('follow them')
    expect(email.html).not.toContain('<script')
    expect(email.paragraphs.join(' ')).not.toContain('https://')
  })

  it('escapes a name that tries to inject markup', () => {
    const email = ritualFollowup({ ...FACTS, other: '<img>' }, 'https://example.test/a', 'https://example.test/off')
    expect(email.html).toContain('&lt;img&gt;')
    expect(email.html).not.toContain('<img>')
  })
})

describe('followupDue', () => {
  const end = new Date('2026-11-20T01:00:00Z')

  it('waits until the event is over, then stays open for the next morning', () => {
    expect(followupDue(end, new Date('2026-11-20T00:59:00Z'))).toBe(false)
    expect(followupDue(end, new Date('2026-11-20T09:15:00Z'))).toBe(true)
    expect(followupDue(end, new Date('2026-11-22T01:00:00Z'))).toBe(false)
  })
})

describe('ritualEmailBlock', () => {
  it('sends once, and not when the dancer turned these emails off or has no address', () => {
    expect(ritualEmailBlock({ email: 'a@b.c', matchEmails: true, alreadySent: false })).toBeNull()
    expect(ritualEmailBlock({ email: null, matchEmails: true, alreadySent: false })).toBe('no_email')
    expect(ritualEmailBlock({ email: 'a@b.c', matchEmails: false, alreadySent: false })).toBe('off')
    expect(ritualEmailBlock({ email: 'a@b.c', matchEmails: true, alreadySent: true })).toBe('already')
  })
})

describe('givenName', () => {
  it('keeps a single given name', () => {
    expect(givenName('Mary Jane')).toBe('Mary')
    expect(givenName('  ')).toBe('')
    expect(givenName(null)).toBe('')
  })
})
