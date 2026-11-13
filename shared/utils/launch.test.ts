import { describe, it, expect } from 'vitest'
import { STEPS, STAGES, stepByKey, nameVerdict, doneBlocker, workspaceValues, copyText, stepLinks, nameChecks, stageProgress } from './launch'

const v = workspaceValues([
  { brandName: 'Corazón Cubano', brandInstagram: '@alosha_corazon_cubano' },
  { placeName: 'La Clave', displayName: 'La Clave – Latin Disco', venueName: 'Luma', address: 'Neuhauser Str. 47, 80331 München', city: 'Munich', night: 'Every Thursday', hours: '19:00–00:00' },
  { searchWords: 'Latin Disco, Salsa, Bachata, Timba' },
], 'La Timbería')

describe('launch catalogue', () => {
  it('has unique step keys, every step has a why, stages 1–3 live and 4–8 next', () => {
    expect(new Set(STEPS.map(s => s.key)).size).toBe(STEPS.length)
    for (const s of STEPS) expect(s.why.length).toBeGreaterThan(10)
    expect(STAGES.filter(s => s.live).map(s => s.n)).toEqual([1, 2, 3])
    expect(STAGES).toHaveLength(8)
  })

  it('covers the channels the organiser named', () => {
    const keys = STEPS.map(s => s.key)
    for (const k of ['maps.name', 'maps.basics', 'maps.description', 'maps.weekly_post', 'maps.reviews', 'ig.handle', 'ig.profile', 'ig.habits', 'site.page', 'wedance.series', 'listing.salsavida', 'listing.rausgegangen', 'listing.inmuenchen', 'listing.gonedancing', 'listing.latindancecalendar']) expect(keys).toContain(k)
  })
})

describe('evidence rule', () => {
  it('a name is never free without a link', () => {
    expect(nameVerdict([])).toBe('unchecked')
    expect(nameVerdict([{ verdict: 'free', url: null }])).toBe('unclear')
    expect(nameVerdict([{ verdict: 'free', url: '  ' }])).toBe('unclear')
    expect(nameVerdict([{ verdict: 'free', url: 'https://www.instagram.com/latimberia/' }])).toBe('free')
  })
  it('one "taken" beats any number of "free"', () => {
    expect(nameVerdict([{ verdict: 'free', url: 'https://a' }, { verdict: 'taken', url: 'https://mambojazz.de/' }])).toBe('taken')
  })
  it('proof steps need a link to be done; the name step needs a decision', () => {
    expect(doneBlocker(stepByKey('maps.name')!, [])).toMatch(/link/)
    expect(doneBlocker(stepByKey('maps.name')!, [{ url: 'https://maps.google.com/x' }])).toBeNull()
    expect(doneBlocker(stepByKey('maps.description')!, [])).toBeNull()
    expect(doneBlocker(stepByKey('name.pick')!, [], {})).toMatch(/name/)
    expect(doneBlocker(stepByKey('name.pick')!, [], { chosenName: 'La Timbería' })).toBeNull()
  })
})

describe('drafts', () => {
  it('the decided name replaces the working name everywhere, keeping the search words', () => {
    expect(v.placeName).toBe('La Timbería')
    expect(v.displayName).toBe('La Timbería – Latin Disco')
  })
  it('the Maps description starts with the search words', () => {
    const s = stepByKey('maps.description')!
    const { text } = copyText(s, s.copy[0]!, v)
    expect(text.startsWith('Latin Disco, Salsa, Bachata, Timba in Munich.')).toBe(true)
    expect(text).toContain('Luma')
    expect(text.length).toBeLessThanOrEqual(750)
  })
  it('the Instagram bio stays under 150 characters', () => {
    const s = stepByKey('ig.profile')!
    const bio = s.copy.find(c => c.key === 'bio')!
    expect(copyText(s, bio, { ...v, pitchShort: 'x'.repeat(300) }).text.length).toBeLessThanOrEqual(150)
  })
  it('the bio keeps whole lines: a long pitch gives way to the search words, never a half-cut address', () => {
    const text = stepByKey('ig.profile')!.copy.find(c => c.key === 'bio')!.draft({ ...v, pitchShort: 'A weekly Latin night in Munich’s city centre: a free after-work warm-up from 19:00, the fiesta from 21:00.' })
    expect(text).toContain('📍 Neuhauser Str. 47, 80331 München')
    expect(text.startsWith('Latin Disco, Salsa, Bachata')).toBe(true)
    expect(text).not.toContain('…')
  })
  it('never invents: empty fields leave their words out', () => {
    const s = stepByKey('maps.description')!
    const { text } = copyText(s, s.copy[0]!, {})
    expect(text).toBe('')
    expect(copyText(stepByKey('maps.weekly_post')!, stepByKey('maps.weekly_post')!.copy[0]!, {}).text).not.toMatch(/€|\d{2}:\d{2}/)
  })
  it('an organiser edit sticks over the draft', () => {
    const s = stepByKey('maps.name')!
    expect(copyText(s, s.copy[0]!, v, { name: 'My own' })).toEqual({ text: 'My own', edited: true })
    expect(copyText(s, s.copy[0]!, v)).toEqual({ text: 'La Timbería – Latin Disco', edited: false })
  })
})

describe('links', () => {
  it('a corrected link wins and counts as checked', () => {
    const s = stepByKey('listing.gonedancing')!
    expect(stepLinks(s, v, { username: 'x' })[0]).toMatchObject({ checked: false, edited: false })
    expect(stepLinks(s, v, { username: 'x' }, { 'link:0': 'https://example.org/add' })[0]).toMatchObject({ url: 'https://example.org/add', checked: true, edited: true })
  })
  it('name checks build search links and an Instagram handle without accents', () => {
    const c = nameChecks('La Timbería', 'München')
    expect(c.find(x => x.source === 'Instagram')!.url).toBe('https://www.instagram.com/latimberia/')
    expect(c[0]!.url).toContain('%22La%20Timber%C3%ADa%22')
  })
})

describe('progress', () => {
  it('stages 4–8 are "next"; a stage is done when all its steps are', () => {
    const p = stageProgress({ 'brand.why': 'done', 'brand.where': 'done', 'brand.pitch': 'done', 'name.pick': 'doing' })
    expect(p.find(s => s.key === 'brand')!.state).toBe('done')
    expect(p.find(s => s.key === 'name')!.state).toBe('doing')
    expect(p.find(s => s.key === 'channels')!.state).toBe('todo')
    expect(p.filter(s => s.state === 'next')).toHaveLength(5)
  })
})
