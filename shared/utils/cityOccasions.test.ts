import { describe, expect, it } from 'vitest'
import {
  easterSunday, firstAdvent, oktoberfest, occasionsFor, occasionByKey, occasionText, occasionPostText,
  planMonths, isBavaria, rangeLabel,
} from './cityOccasions'

const munich = { citySlug: 'munich', countryCode: 'DE', region: 'Bavaria' }
const berlin = { citySlug: 'berlin', countryCode: 'DE', region: 'Berlin' }
const vienna = { citySlug: 'vienna', countryCode: 'AT', region: 'Vienna' }

describe('dates', () => {
  it('finds Easter', () => {
    expect(easterSunday(2026)).toBe('2026-04-05')
    expect(easterSunday(2027)).toBe('2027-03-28')
    expect(easterSunday(2028)).toBe('2028-04-16')
  })
  it('finds the first Sunday of Advent, also when Christmas Eve is a Sunday', () => {
    expect(firstAdvent(2026)).toBe('2026-11-29')
    expect(firstAdvent(2023)).toBe('2023-12-03') // 24 Dec 2023 was a Sunday
  })
  it('finds Oktoberfest, stretched to 3 Oct when the first Sunday comes earlier', () => {
    expect(oktoberfest(2026)).toEqual({ start: '2026-09-19', end: '2026-10-04' })
    expect(oktoberfest(2027)).toEqual({ start: '2027-09-18', end: '2027-10-03' })
    expect(oktoberfest(2025)).toEqual({ start: '2025-09-20', end: '2025-10-05' })
    expect(oktoberfest(2024)).toEqual({ start: '2024-09-21', end: '2024-10-06' })
    expect(oktoberfest(2030).end).toBe('2030-10-06')
  })
})

describe('occasionsFor', () => {
  const list = occasionsFor(munich, '2026-11-15')
  const byId = (id: string) => list.find(o => o.id === id)!

  it('gives Munich the Bavarian silent days on the right dates', () => {
    expect(byId('volkstrauertag')).toMatchObject({ start: '2026-11-15', kind: 'silent', silentFrom: '02:00' }) // today still counts
    expect(byId('buss-und-bettag')).toMatchObject({ start: '2026-11-18', postBy: '2026-11-16' })
    expect(byId('totensonntag').start).toBe('2026-11-22')
    expect(byId('christmas-eve')).toMatchObject({ start: '2026-12-24', silentFrom: '14:00' })
    expect(byId('ash-wednesday').start).toBe('2027-02-10')
    expect(byId('easter-silent')).toMatchObject({ start: '2027-03-25', end: '2027-03-27' })
    expect(list.some(o => o.id === 'all-saints')).toBe(false) // 1 Nov 2026 is over; 2027's is past the window
  })

  it('gives Munich its parties and seasons, with a date to ask organisers', () => {
    expect(byId('new-years-eve')).toMatchObject({ start: '2026-12-31', askBy: '2026-12-01', kind: 'party' })
    expect(byId('fasching')).toMatchObject({ start: '2027-02-04', end: '2027-02-09' })
    expect(byId('oktoberfest')).toMatchObject({ start: '2027-09-18', end: '2027-10-03' })
    expect(byId('halloween').start).toBe('2027-10-31')
  })

  it('is sorted and stays within 12 months', () => {
    expect(list.map(o => o.start)).toEqual([...list.map(o => o.start)].sort())
    expect(list.every(o => o.start < '2027-11-01')).toBe(true)
  })

  it('leaves silent days and Oktoberfest out elsewhere', () => {
    const b = occasionsFor(berlin, '2026-11-15')
    expect(b.some(o => o.kind === 'silent')).toBe(false)
    expect(b.some(o => o.id === 'oktoberfest')).toBe(false)
    expect(b.some(o => o.id === 'fasching')).toBe(true)
    expect(occasionsFor(vienna, '2026-11-15').some(o => o.id === 'fasching')).toBe(true)
    expect(occasionsFor({ citySlug: 'madrid', countryCode: 'ES' }, '2026-11-15').some(o => o.id === 'fasching')).toBe(false)
  })

  it('knows Bavaria from the region or, without one, from the city', () => {
    expect(isBavaria({ citySlug: 'x', region: 'Bayern' })).toBe(true)
    expect(isBavaria({ citySlug: 'nuremberg', countryCode: 'DE', region: null })).toBe(true)
    expect(isBavaria(berlin)).toBe(false)
  })
})

describe('occasionByKey', () => {
  it('rebuilds an occasion, only where it applies', () => {
    expect(occasionByKey(munich, 'buss-und-bettag:2026')?.start).toBe('2026-11-18')
    expect(occasionByKey(berlin, 'buss-und-bettag:2026')).toBeNull()
    expect(occasionByKey(munich, 'nope:2026')).toBeNull()
    expect(occasionByKey(munich, 'halloween:abc')).toBeNull()
  })
})

describe('the post', () => {
  const upcoming = occasionsFor(munich, '2026-11-15')
  const bub = upcoming.find(o => o.id === 'buss-und-bettag')!
  const base = { cityName: 'Munich', upcoming, events: [], link: 'https://2026.wedance.vip/cities/munich' }

  it('explains Tanzverbot with the times and the next silent days', () => {
    const t = occasionText({ ...base, occasion: bub, lang: 'en' })
    expect(t).toContain('Wed 18 Nov: Day of Prayer and Repentance — a silent day in Bavaria (02:00–24:00)')
    expect(t).toContain('Coming up: Wed 18 Nov · Sun 22 Nov · Thu 24 Dec · Wed 10 Feb')
    expect(t).toContain('Ask your school')
    expect(t.endsWith(base.link)).toBe(true)
  })

  it('uses the German name in other languages and the Easter times', () => {
    expect(occasionText({ ...base, occasion: bub, lang: 'ru' })).toContain('Buß- und Bettag')
    const easter = upcoming.find(o => o.id === 'easter-silent')!
    expect(occasionText({ ...base, occasion: easter, lang: 'de' })).toContain('Fr & Sa ganztags')
  })

  it('lists the city’s parties for a party occasion', () => {
    const nye = upcoming.find(o => o.id === 'new-years-eve')!
    const events = [{ id: '1', name: 'NYE Salsa Gala', type: 'party', startDate: '2026-12-31T20:00:00Z', timezone: 'Europe/Berlin', venueName: 'Salsa Club' }]
    const t = occasionText({ ...base, occasion: nye, lang: 'en', events })
    expect(t).toContain('✨ New Year’s Eve in Munich · Thu 31 Dec')
    expect(t).toContain('21:00 NYE Salsa Gala · Salsa Club')
    expect(occasionText({ ...base, occasion: nye, lang: 'en' })).toContain('No parties listed yet')
  })

  it('puts the chosen languages one after another', () => {
    const t = occasionPostText({ ...base, occasion: bub, langs: ['en', 'es'] })
    expect(t.indexOf('What is Tanzverbot?')).toBeLessThan(t.indexOf('🇪🇸'))
    expect(t).toContain('¿Qué es el Tanzverbot?')
    expect(t).not.toContain('Что такое')
  })
})

it('labels months and ranges', () => {
  expect(planMonths('2026-11-15')).toHaveLength(12)
  expect(planMonths('2026-11-15')[0]).toBe('2026-11')
  expect(planMonths('2026-11-15')[11]).toBe('2027-10')
  expect(rangeLabel({ start: '2027-03-25', end: '2027-03-27' })).toBe('Thu 25 Mar – Sat 27 Mar')
})
