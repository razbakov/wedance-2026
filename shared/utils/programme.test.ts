import { describe, it, expect } from 'vitest'
import {
  agendaToSessions, agendaType, cleanSession, defaultDuration, inferDurations, isEveningItem, isWorkshop,
  minutesUntil, outsideEventHours, outsideHoursNote, programmePostItems, programmePostLine, sessionEnd, sessionKindLabel, sessionTimeRange, sessionType, untilInText,
  type DraftSession,
} from './programme'

const draft = (time: string, type: DraftSession['type'], title = type, extra: Partial<DraftSession> = {}): DraftSession =>
  ({ id: `s-${time}`, date: '2026-10-31', time, type, title, artist: '', style: '', ...extra })

describe('session types (#455)', () => {
  it('keeps the old values and knows the new ones; anything else is "other"', () => {
    for (const t of ['workshop', 'party', 'show', 'concert', 'doors', 'other']) expect(sessionType(t)).toBe(t)
    expect(sessionType('rave')).toBe('other')
    expect(sessionType(undefined)).toBe('workshop') // old mock data had no type
  })
  it('only a workshop is a class; the night covers everything but classes and doors', () => {
    expect(isWorkshop('workshop')).toBe(true)
    expect(isWorkshop(undefined)).toBe(true)
    expect(['party', 'show', 'concert', 'doors', 'other'].some(isWorkshop)).toBe(false)
    expect(['party', 'show', 'concert', 'other'].every(isEveningItem)).toBe(true)
    expect(isEveningItem('doors')).toBe(false)
    expect(isEveningItem('workshop')).toBe(false)
  })
  it('per-type defaults: doors a moment, show 60, concert 90, party 180, workshop 60', () => {
    expect(['doors', 'show', 'concert', 'party', 'workshop', 'other'].map(t => defaultDuration(t as any))).toEqual([0, 60, 90, 180, 60, 60])
  })
  it('an old agenda line gets its type from its words', () => {
    expect(agendaType('Open doors')).toBe('doors')
    expect(agendaType('Einlass')).toBe('doors')
    expect(agendaType('Halloween show')).toBe('show')
    expect(agendaType('Live concert with Son Cubano')).toBe('concert')
    expect(agendaType('Afterparty with DJ Max')).toBe('party')
    expect(agendaType('Salsa beginners')).toBe('workshop')
  })
})

describe('a level only on a workshop', () => {
  it('cleanSession drops the level on every other type and keeps it on a workshop', () => {
    expect(cleanSession({ type: 'party', level: 'Beginner' as const, title: 'x' })).toEqual({ type: 'party', title: 'x' })
    expect(cleanSession({ type: 'doors', level: 'Beginner' as const })).not.toHaveProperty('level')
    expect(cleanSession({ type: 'workshop', level: 'Advanced' as const })).toEqual({ type: 'workshop', level: 'Advanced' })
  })
  it('agendaToSessions puts "Beginner" on classes only', () => {
    const s = agendaToSessions([{ time: '18:00', what: 'Open doors' }, { time: '18:30', what: 'Salsa class' }, { time: '19:30', what: 'Party' }], { date: '2026-10-31', startTime: '18:00' })
    expect(s.map(x => [x.type, x.level])).toEqual([['doors', undefined], ['workshop', 'Beginner'], ['party', undefined]])
  })
})

describe('inferDurations', () => {
  it('B-FEST: doors are a moment, the show runs until the afterparty, the afterparty until the event’s end', () => {
    const out = inferDurations([draft('18:00', 'doors', 'Open Doors'), draft('19:00', 'show', 'B-FEST show'), draft('20:30', 'party', 'Afterparty')], { date: '2026-10-31', endTime: '22:00' })
    expect(out.map(s => s.duration)).toEqual([0, 90, 90])
    expect(out.map(sessionTimeRange)).toEqual(['18:00', '19:00–20:30', '20:30–22:00'])
  })
  it('"until 22:00" in the title wins over the event end and the default', () => {
    const [s] = inferDurations([draft('20:30', 'party', 'Afterparty until 22:00')], { date: '2026-10-31', endTime: '23:59' })
    expect(s!.duration).toBe(90)
  })
  it('an explicit end time wins over a duration; a given duration wins over inference', () => {
    const out = inferDurations([
      draft('19:00', 'show', 'Show', { endTime: '20:30', duration: 30 }),
      draft('21:00', 'party', 'Party', { duration: 45 }),
      draft('23:00', 'party', 'Late'),
    ])
    expect(out.map(s => s.duration)).toEqual([90, 45, 180])
    expect(out[0]).not.toHaveProperty('endTime')
  })
  it('the last item runs past midnight to the event’s end; without an end, its type’s default', () => {
    expect(inferDurations([draft('22:00', 'party')], { date: '2026-10-31', endTime: '03:00' })[0]!.duration).toBe(300)
    expect(inferDurations([draft('22:00', 'party')], { date: '2026-10-31', endDate: '2026-11-01', endTime: '03:00' })[0]!.duration).toBe(300)
    expect(inferDurations([draft('22:00', 'concert')], { date: '2026-10-31' })[0]!.duration).toBe(90)
  })
  it('a festival: only its very last item runs until the festival’s end; other days end on their default', () => {
    const out = inferDurations([
      { ...draft('22:00', 'party'), date: '2026-11-06' },
      { ...draft('22:00', 'party'), date: '2026-11-07' },
      { ...draft('23:00', 'party'), date: '2026-11-08' },
    ], { date: '2026-11-06', endDate: '2026-11-09', endTime: '04:00' })
    expect(out.map(s => s.duration)).toEqual([180, 180, 300])
  })
  it('parallel rooms: the next item is the next later start, not one at the same time', () => {
    const out = inferDurations([draft('10:00', 'workshop', 'A'), draft('10:00', 'workshop', 'B'), draft('11:15', 'workshop', 'C')])
    expect(out.map(s => s.duration)).toEqual([75, 75, 60])
  })
  it('a long gap to the next item (lunch, a day gap) falls back to the default', () => {
    expect(inferDurations([draft('09:30', 'workshop'), draft('20:00', 'party')])[0]!.duration).toBe(60)
  })
  it('a session kept from before keeps its stored length', () => {
    expect(inferDurations([draft('21:00', 'party', 'Party', { duration: 240 })])[0]!.duration).toBe(240)
  })
})

describe('time helpers', () => {
  it('minutesUntil wraps past midnight', () => {
    expect(minutesUntil('19:00', '20:30')).toBe(90)
    expect(minutesUntil('23:00', '01:00')).toBe(120)
  })
  it('untilInText reads until/till/bis and ranges', () => {
    expect(untilInText('Afterparty until 22:00')).toBe('22:00')
    expect(untilInText('Party bis 1:30')).toBe('01:30')
    expect(untilInText('Show 19:00–20:30')).toBe('20:30')
    expect(untilInText('Salsa On2')).toBeNull()
    expect(untilInText('till 25:00')).toBeNull()
    expect(untilInText('Afterparty till 22.30')).toBe('22:30')
    expect(untilInText('Entry 5-10.00 €')).toBeNull()
  })
  it('sessionEnd: none for a moment; wraps past midnight', () => {
    expect(sessionEnd({ time: '18:00', duration: 0 })).toBeNull()
    expect(sessionEnd({ time: '23:30', duration: 90 })).toBe('01:00')
  })
})

describe('rendering helpers', () => {
  it('sessionKindLabel: the type for non-classes, style and level for a class', () => {
    expect(sessionKindLabel({ type: 'doors', style: '', level: 'Beginner' })).toBe('Doors open')
    expect(sessionKindLabel({ type: 'show', style: 'Salsa' })).toBe('Show')
    expect(sessionKindLabel({ type: 'workshop', style: 'Salsa', level: 'Intermediate' })).toBe('Salsa · Intermediate')
    expect(sessionKindLabel({ type: 'workshop', style: '' })).toBe('Workshop')
  })
  it('a programme post lists a festival’s classes, else a party’s show and party, never the doors', () => {
    const festival = [{ type: 'workshop', t: 'a' }, { type: 'party', t: 'b' }]
    expect(programmePostItems(festival).map(x => x.t)).toEqual(['a'])
    const night = [{ type: 'doors', t: 'd' }, { type: 'show', t: 's' }, { type: 'party', t: 'p' }]
    expect(programmePostItems(night).map(x => x.t)).toEqual(['s', 'p'])
  })
  it('programmePostLine: a range for the night, the plain start for a class', () => {
    expect(programmePostLine({ date: '2026-10-31', time: '19:00', duration: 90, type: 'show', title: 'B-FEST show' }, 'Sat', '')).toBe('Sat 19:00–20:30 · B-FEST show')
    expect(programmePostLine({ date: '2026-10-31', time: '18:00', duration: 60, type: 'workshop', title: 'Salsa' }, 'Sat', 'Ana')).toBe('Sat 18:00 · Salsa · Ana')
  })
})

describe('outside the event’s hours (RAZ-1027)', () => {
  const night = { date: '2026-11-19', startTime: '20:00', endTime: '02:00' }
  const at = (time: string, date = '2026-11-19') => ({ date, time })

  it('a party 20:00–02:00: the afternoon is before, the evening and the hours after midnight are inside', () => {
    expect(outsideEventHours(at('15:00'), night)).toBe('before')
    expect(outsideEventHours(at('20:00'), night)).toBeNull()
    expect(outsideEventHours(at('23:30'), night)).toBeNull()
    expect(outsideEventHours(at('00:00'), night)).toBeNull()
    expect(outsideEventHours(at('01:00'), night)).toBeNull()
    expect(outsideEventHours(at('02:00'), night)).toBeNull()
    expect(outsideEventHours(at('02:01'), night)).toBe('after')
    expect(outsideEventHours(at('03:00'), night)).toBe('after')
  })

  it('the same 01:00 on the next calendar day is still inside; 03:00 that morning is after', () => {
    expect(outsideEventHours(at('01:00', '2026-11-20'), night)).toBeNull()
    expect(outsideEventHours(at('03:00', '2026-11-20'), night)).toBe('after')
    expect(outsideEventHours(at('15:00', '2026-11-20'), night)).toBe('after')
  })

  it('a night that does not cross midnight does not treat 01:00 as inside', () => {
    const evening = { date: '2026-11-19', startTime: '20:00', endTime: '23:00' }
    expect(outsideEventHours(at('19:30'), evening)).toBe('before')
    expect(outsideEventHours(at('21:00'), evening)).toBeNull()
    expect(outsideEventHours(at('23:00'), evening)).toBeNull()
    expect(outsideEventHours(at('23:30'), evening)).toBe('after')
    expect(outsideEventHours(at('01:00'), evening)).toBe('before')
  })

  it('a daytime event: before the start, after the end, nothing about midnight', () => {
    const day = { date: '2026-11-19', startTime: '10:00', endTime: '18:00' }
    expect(outsideEventHours(at('09:00'), day)).toBe('before')
    expect(outsideEventHours(at('10:00'), day)).toBeNull()
    expect(outsideEventHours(at('18:00'), day)).toBeNull()
    expect(outsideEventHours(at('18:30'), day)).toBe('after')
  })

  it('no end yet: only a time before the start is outside', () => {
    const open = { date: '2026-11-19', startTime: '20:00' }
    expect(outsideEventHours(at('15:00'), open)).toBe('before')
    expect(outsideEventHours(at('01:00'), open)).toBe('before')
    expect(outsideEventHours(at('22:00'), open)).toBeNull()
  })

  it('a festival is one span: midday on the middle day is inside, the first morning is before, the last morning after the end is after', () => {
    const fest = { date: '2026-11-06', startTime: '18:00', endDate: '2026-11-08', endTime: '02:00' }
    expect(outsideEventHours({ date: '2026-11-06', time: '01:00' }, fest)).toBe('before')
    expect(outsideEventHours({ date: '2026-11-06', time: '15:00' }, fest)).toBe('before')
    expect(outsideEventHours({ date: '2026-11-06', time: '19:00' }, fest)).toBeNull()
    expect(outsideEventHours({ date: '2026-11-07', time: '01:00' }, fest)).toBeNull()
    expect(outsideEventHours({ date: '2026-11-07', time: '15:00' }, fest)).toBeNull()
    expect(outsideEventHours({ date: '2026-11-08', time: '01:00' }, fest)).toBeNull()
    expect(outsideEventHours({ date: '2026-11-08', time: '03:00' }, fest)).toBe('after')
  })

  it('says nothing when there is no start, no clock time, or the time is inside', () => {
    expect(outsideEventHours(at('21:00'), { date: '2026-11-19', startTime: '' })).toBeNull()
    expect(outsideEventHours(at(''), night)).toBeNull()
    expect(outsideEventHours(at('25:00'), night)).toBeNull()
    expect(outsideEventHours({ date: '', time: '21:00' }, night)).toBeNull()
  })

  it('the note names the hours and says a pre-party or an after-party can stay', () => {
    expect(outsideHoursNote(at('15:00'), night)).toBe('Before the event’s hours (20:00–02:00). A pre-party can stay.')
    expect(outsideHoursNote(at('03:00'), night)).toBe('After the event’s hours (20:00–02:00). An after-party can stay.')
    expect(outsideHoursNote(at('01:00'), night)).toBeNull()
    expect(outsideHoursNote(at('18:00'), { date: '2026-11-19', startTime: '20:00' })).toBe('Before the event starts (20:00). A pre-party can stay.')
  })
})

describe('stylesOf (RAZ-1008)', () => {
  it('splits combined styles and drops empty ones', async () => {
    const { stylesOf } = await import('./programme')
    expect(stylesOf('Bachata Dominicana, Timba')).toEqual(['Bachata Dominicana', 'Timba'])
    expect(stylesOf('Salsa / Bachata')).toEqual(['Salsa', 'Bachata'])
    expect(stylesOf('')).toEqual([])
    expect(stylesOf(undefined)).toEqual([])
    expect(stylesOf(' Reparto ')).toEqual(['Reparto'])
  })
})
