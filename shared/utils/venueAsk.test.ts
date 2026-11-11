import { describe, expect, it } from 'vitest'
import { accessWindows, eventKind, planLine, planSummary, venueAskLines, venueAskMessage, venuePlan, type VenueAskFacts } from './venueAsk'

const s = (o: Partial<Parameters<typeof venuePlan>[0][number]>) => ({ date: '2026-11-22', time: '20:00', duration: 60, type: 'workshop' as const, title: '', artist: '', style: '', ...o })

describe('venuePlan', () => {
  it('keeps the sessions at this venue, in order, with ends and names', () => {
    const { plan, elsewhere } = venuePlan([
      s({ time: '20:30', duration: 210, type: 'party', title: 'Misterio en Blanco', artist: 'dj-y' }),
      s({ time: '19:30', duration: 60, title: 'Salsa On1', style: 'Salsa', level: 'Intermediate', artist: 'ana', with: ['ivan'] }),
      s({ time: '18:00', title: 'Bachata', venue: 'Studio Z, Munich' }),
      s({ time: '21:00', type: 'show', title: 'Show', venue: 'Salsea Dance Academy' }),
    ], 'Salsea Dance Academy', h => ({ ana: 'Ana', ivan: 'Ivan', 'dj-y': 'DJ Y' })[h] ?? h)
    expect(elsewhere).toBe(1)
    expect(plan.map(p => [p.time, p.end, p.kind, p.who])).toEqual([
      ['19:30', '20:30', 'Salsa · Intermediate', 'Ana & Ivan'],
      ['20:30', '00:00', 'Party', 'DJ Y'],
      ['21:00', '22:00', 'Show', ''],
    ])
  })
})

describe('planSummary', () => {
  it('collapses back-to-back classes and keeps the night', () => {
    const { plan } = venuePlan([
      s({ time: '10:00', style: 'Timba', artist: 'a' }), s({ time: '11:00', style: 'Rumba', artist: 'a' }),
      s({ time: '12:00', title: 'Lunch break' }), s({ time: '13:00', style: 'Timba', artist: 'a' }),
      s({ time: '21:00', duration: 180, type: 'party', title: 'Party' }),
    ], 'x')
    expect(planSummary(plan)).toEqual(['10:00–14:00 3 workshops', '21:00–00:00 party'])
  })
})

describe('accessWindows', () => {
  it('opens setup before the first item and closes after cleanup, past midnight', () => {
    const plan = [{ date: '2026-11-22', time: '19:30', end: '20:30' }, { date: '2026-11-22', time: '20:30', end: '01:00' }]
    expect(accessWindows(plan, { date: '2026-11-22', start: '19:30' }, 30, 30)).toEqual([{ date: '2026-11-22', from: '19:00', until: '01:30' }])
  })
  it('falls back to the event times without a plan', () => {
    expect(accessWindows([], { date: '2026-11-22', start: '20:00', end: '00:00' }, 60, 0)).toEqual([{ date: '2026-11-22', from: '19:00', until: '00:00' }])
    expect(accessWindows([], { date: '2026-11-22', start: '20:00' })).toEqual([{ date: '2026-11-22', from: '19:30', until: null }])
  })
  it('splits a day with a long break into two windows', () => {
    const plan = [{ date: 'd', time: '10:00', end: '11:00' }, { date: 'd', time: '13:00', end: '15:00' }, { date: 'd', time: '21:00', end: '00:00' }]
    expect(accessWindows(plan, { date: 'd', start: '10:00' }, 30, 30)).toEqual([
      { date: 'd', from: '09:30', until: '15:30' },
      { date: 'd', from: '20:30', until: '00:30' },
    ])
  })
  it('gives one window per day', () => {
    const plan = [{ date: '2026-11-21', time: '12:00', end: '18:00' }, { date: '2026-11-22', time: '11:00', end: '13:00' }]
    expect(accessWindows(plan, { date: '2026-11-21', start: '12:00' }, 0, 0).map(w => w.date)).toEqual(['2026-11-21', '2026-11-22'])
  })
})

describe('message', () => {
  const facts: VenueAskFacts = {
    venueName: 'Salsea Dance Academy', host: 'MontunoClub', hostEvents: 12, hostCity: 'Munich', eventName: 'Misterio en Blanco',
    kind: eventKind(['Salsa'], 'Party'), when: 'Saturday 22 November · 20:00–00:00',
    plan: venuePlan([s({ time: '19:30', style: 'Salsa' }), s({ time: '20:30', duration: 210, type: 'party', title: 'Party' })], 'x').plan,
    elsewhere: 0, access: [{ date: '2026-11-22', from: '19:00', until: '00:30' }], multiDay: false, dayLabels: {},
    guests: 30, needs: ['Sound system', 'Bar'], offer: '€200 rent', price: '12€', note: '',
  }
  it('puts the date, plan, room hours and offer before the link', () => {
    const m = venueAskMessage(facts, 'https://x/ask/t')
    expect(m).toContain("This is MontunoClub: we've organised 12 dance events in Munich.")
    expect(m).toContain('Misterio en Blanco (Salsa party)')
    expect(m).toContain('📅 Saturday 22 November · 20:00–00:00')
    expect(m).toContain('🕒 19:30–20:30 Salsa workshop · 20:30–00:00 party')
    expect(m).toContain("🔑 We'd need the room 19:00–00:30")
    expect(m).toContain('👥 About 30 dancers, entry 12€')
    expect(m).toContain('💶 We offer: €200 rent')
    expect(m.trim().endsWith('https://x/ask/t')).toBe(true)
  })
  it('asks their price without an offer and skips what is unknown', () => {
    const m = venueAskMessage({ ...facts, offer: '', guests: null, needs: [], plan: [], access: [], hostEvents: 0 }, 'u')
    expect(m).toContain('💶 What would you charge?')
    expect(m).not.toMatch(/👥|🎵|🕒|🔑|organised/)
    expect(m).not.toContain('\n\n\n')
  })
  it('email lines', () => {
    expect(venueAskLines(facts)).toContain('They offer: €200 rent')
  })
  it('plan lines', () => {
    expect(planLine({ time: '19:00', end: null, type: 'doors', kind: 'Doors open', title: '' })).toBe('19:00 doors open')
    expect(planLine({ time: '12:00', end: '13:00', type: 'workshop', kind: '', title: 'Lunch break' })).toBe('12:00–13:00 lunch break')
    expect(planLine({ time: '10:00', end: '11:00', type: 'workshop', kind: 'Timba · Beginner', title: 'x' })).toBe('10:00–11:00 Timba workshop')
  })
})
