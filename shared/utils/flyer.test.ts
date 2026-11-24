import { describe, it, expect } from 'vitest'
import { flyerLines, flyerChanges, checkFlyerText, paintPrompt, recomposePrompt, fixPrompt, refreshPrompt, priceLines, programmeLines, edgeCut, edgeFixNote } from './flyer'

// Thu 15 Oct 2026, 19:00–23:00 Berlin (UTC+2)
const ev = {
  name: 'La Clave Thursday',
  startDate: '2026-10-15T17:00:00Z',
  endDate: '2026-10-15T21:00:00Z',
  timezone: 'Europe/Berlin',
  venueName: 'Luma',
  venueAddress: 'Neuhauser Str. 47, München',
  agenda: [{ time: '19:00', what: 'Reparto workshop · Yunior' }, { time: '21:00', what: 'Party · DJ Hamza' }],
  artists: [{ name: 'DJ Hamza' }, { name: 'Alösha' }],
  styles: ['Timba', 'Bachata'],
  price: 'Workshops free\nFrom 21:00 · 10€\n',
}

describe('flyerLines', () => {
  it('spells every line the poster carries, in order', () => {
    expect(flyerLines(ev).map(l => l.text)).toEqual([
      'LA CLAVE THURSDAY',
      'THURSDAY 15 OCTOBER',
      '19:00 Reparto workshop · Yunior',
      '21:00–23:00 Party · DJ Hamza',
      'DJ HAMZA · ALÖSHA',
      'TIMBA × BACHATA',
      'Workshops free · From 21:00 · 10€',
      'LUMA · NEUHAUSER STR. 47 · MÜNCHEN',
    ])
  })
  it('leaves the agenda off when asked, and shows the time instead', () => {
    const lines = flyerLines({ ...ev, showAgenda: false })
    expect(lines.some(l => l.label === 'agenda')).toBe(false)
    expect(lines.find(l => l.label === 'time')?.text).toBe('19:00 – 23:00')
  })
  it('has no time line when the programme shows: the programme gives the times', () => {
    expect(flyerLines(ev).some(l => l.label === 'time')).toBe(false)
  })
  it('shows the time when there is no programme', () => {
    expect(flyerLines({ ...ev, agenda: [] }).find(l => l.label === 'time')?.text).toBe('19:00 – 23:00')
  })
  it('ends the last item when the programme says, else when the night ends', () => {
    const lines = flyerLines({ ...ev, agenda: [{ time: '19:00', what: 'Class', end: '20:00' }, { time: '21:00', what: 'Party', end: '00:00' }] })
    expect(lines.filter(l => l.label === 'agenda').map(l => l.text)).toEqual(['19:00 Class', '21:00–00:00 Party'])
  })
  it('keeps price lines as typed, dropping blanks', () => {
    expect(priceLines(' Free \n\n10€ ')).toEqual(['Free', '10€'])
  })
  it('shows passes when there are no promotions', () => {
    const lines = flyerLines({ ...ev, price: '', passes: ['Full Pass · 210 €', 'Party Pass · 80 €'] })
    expect(lines.find(l => l.label === 'entry')?.text).toBe('Full Pass · 210 € · Party Pass · 80 €')
  })
  it('shows passes, then promotions', () => {
    const lines = flyerLines({ ...ev, price: 'Early bird −20%', passes: ['Full Pass · 210 €'] })
    expect(lines.find(l => l.label === 'entry')?.text).toBe('Full Pass · 210 € · Early bird −20%')
  })
  it('limits passes to 3 on the flyer', () => {
    const lines = flyerLines({ ...ev, price: '', passes: ['A · 10 €', 'B · 20 €', 'C · 30 €', 'D · 40 €'] })
    expect(lines.find(l => l.label === 'entry')?.text).toBe('A · 10 € · B · 20 € · C · 30 €')
  })
})

describe('flyerChanges', () => {
  it('pairs what changed and names new and dropped faces', () => {
    const was = { lines: ['A', 'DJ HAMZA', 'C'], pictured: ['DJ Hamza'] }
    const now = { lines: ['A', 'ELLIS', 'C'], pictured: ['Ellis'] }
    expect(flyerChanges(was, now)).toEqual([
      { was: 'DJ HAMZA', now: 'ELLIS' },
      { was: 'Photo: DJ Hamza', now: 'Photo: Ellis' },
    ])
  })
  it('is empty when nothing changed', () => {
    expect(flyerChanges({ lines: ['A'], pictured: [] }, { lines: ['A'], pictured: [] })).toEqual([])
  })
  it('a flyer kept with the old time line still matches when the programme took its place', () => {
    const was = ['T', 'THURSDAY 26 NOVEMBER', '19:00 – 00:00', '19:00 Class', '21:00 Party', 'LUMA']
    const now = ['T', 'THURSDAY 26 NOVEMBER', '19:00 Class', '21:00–00:00 Party', 'LUMA']
    expect(flyerChanges({ lines: was, pictured: [] }, { lines: now, pictured: [] })).toEqual([])
  })
  it('still shows a changed end time on a flyer kept with the old time line', () => {
    const was = ['T', '19:00 – 00:00', '19:00 Class', '21:00 Party']
    const now = ['T', '19:00 Class', '21:00–01:00 Party']
    expect(flyerChanges({ lines: was, pictured: [] }, { lines: now, pictured: [] })).toEqual([
      { was: '19:00 – 00:00', now: '21:00–01:00 Party' },
      { was: '21:00 Party', now: null },
    ])
  })
  it('still shows a changed start time on a flyer kept with the old time line', () => {
    const was = ['T', '19:00 – 00:00', '19:00 Class', '21:00 Party']
    const now = ['T', '20:00 Class', '21:00–00:00 Party']
    expect(flyerChanges({ lines: was, pictured: [] }, { lines: now, pictured: [] }).length).toBeGreaterThan(0)
  })
})

describe('checkFlyerText', () => {
  const lines = flyerLines(ev)
  it('passes when every line is on the poster, split or not', () => {
    const seen = ['THURSDAY 15 OCTOBER', 'LA CLAVE THURSDAY', '19:00 REPARTO WORKSHOP • YUNIOR', '21:00 - 23:00 PARTY · DJ HAMZA',
      'DJ HAMZA', 'ALÖSHA', 'WORKSHOPS FREE · FROM 21:00 · 10€', 'LUMA', 'NEUHAUSER STR. 47', 'MÜNCHEN', 'CUBA']
    const c = checkFlyerText(lines, seen)
    expect(c.missing).toEqual([])
    expect(c.ok).toBe(true)
    expect(c.extra).toEqual(['CUBA'])
  })
  it('names a misspelt line, umlauts included', () => {
    const seen = ['THURSDAY 15 OCTOBER', 'LA CLAVE THURSDAY', '19:00 Reparto workshop · Yunior', '21:00–23:00 Party · DJ Hamza',
      'DJ HAMZA · ALÖSHA', 'Workshops free · From 21:00 · 10€', 'LUMA · NEUHAUSER STR. 47 · MÜNEHEN']
    const c = checkFlyerText(lines, seen)
    expect(c.ok).toBe(false)
    expect(c.missing).toEqual(['LUMA · NEUHAUSER STR. 47 · MÜNCHEN'])
  })
  it('finds a title with a dash painted on two lines (La Timberia, 2026-11-23)', () => {
    const t = flyerLines({ ...ev, name: 'La Timberia — Reparto & Rueda' })
    const seen = t.map(l => l.label === 'title' ? 'La Timberia' : l.text).concat('REPARTO & RUEDA')
    expect(checkFlyerText(t, seen).missing).toEqual([])
  })
  it('doesn’t require the music line', () => {
    expect(checkFlyerText(lines, lines.filter(l => l.label !== 'music').map(l => l.text)).ok).toBe(true)
  })
})

describe('paintPrompt', () => {
  it('spells out every line and the people', () => {
    const p = paintPrompt(flyerLines(ev), { description: 'Red neon street.' }, { people: ['Yunior'] })
    expect(p).toContain('featuring the person from image 1 as the artist')
    expect(p).toContain('Layout: the date and the title from 5% to 38% of the height')
    expect(p).toContain('"LUMA · NEUHAUSER STR. 47 · MÜNCHEN"')
    expect(p).toContain('"19:00 Reparto workshop · Yunior"')
  })
})

describe('text stays off the edges', () => {
  const lines = flyerLines(ev)
  const look = { description: 'Red neon street.' }
  it('keeps every line inside a margin, including the location bar', () => {
    const p = paintPrompt(lines, look, { people: ['Yunior'] })
    expect(p).toContain('clear margin')
    expect(p).toContain('all four edges')
    expect(p).not.toContain('the details in the bottom 15%')
    expect(p).not.toContain('at the very top')
    expect(p).toContain('the bottom 6% is only background')
    expect(p).not.toContain('bar')
  })
  it('asks for the time small, never as a badge', () => {
    const p = paintPrompt(flyerLines({ ...ev, agenda: [] }), look, { people: ['Yunior'] })
    expect(p).toContain('as small as the date: "19:00 – 23:00". No box or badge')
    expect(p).not.toContain('Big time badge')
  })
  it('tells the painter to move text in where the style reference puts it on the edge', () => {
    expect(paintPrompt(lines, look, { styleRef: true })).toContain('Where it puts text against the edge, move that text inwards')
  })
  it('asks for the same margin when there is nobody to picture', () => {
    const p = paintPrompt(lines, look)
    expect(p).toContain('clear margin')
    expect(p).toContain('the bottom 6% is only background')
  })
  it('keeps the margin when a poster is recomposed, fixed or refreshed', () => {
    for (const p of [recomposePrompt(lines), fixPrompt(lines, 'make the title bigger'), refreshPrompt(lines)]) {
      expect(p).toContain('clear margin')
      expect(p).toContain('cut by the edge')
    }
  })
})

describe('paintPrompt, the house way', () => {
  it('names the style reference as image 1 and numbers the photos after it', () => {
    const p = paintPrompt(flyerLines(ev), { description: 'Red neon street.' }, { styleRef: true, people: ['Yunior', 'Alösha'] })
    expect(p).toContain('Image 1 is the STYLE and LAYOUT reference')
    expect(p).toContain('Image 2: Yunior. Image 3: Alösha.')
    expect(p).toContain('Tall vertical 9:16')
  })
})

describe('a covered word', () => {
  it('fails the check when the reader marks hidden letters', () => {
    const lines = flyerLines(ev)
    const seen = lines.map(l => l.text).map(t => t === 'LA CLAVE THURSDAY' ? 'LA CLAVE TH___DAY' : t)
    expect(checkFlyerText(lines, seen).missing).toEqual(['LA CLAVE THURSDAY'])
  })
})

describe('text cut by the edge', () => {
  it('fails the check when the reader marks letters cut off the bottom', () => {
    const lines = flyerLines(ev)
    const seen = lines.map(l => l.label === 'venue' ? 'LUMA · NEUHAUSER STR. 47 · MÜN____' : l.text)
    const c = checkFlyerText(lines, seen)
    expect(c.ok).toBe(false)
    expect(c.missing).toEqual(['LUMA · NEUHAUSER STR. 47 · MÜNCHEN'])
  })
})

describe('a line at the edge', () => {
  // Boxes as Gemini read them off real flyers: the cut ones end at 996–1000.
  const lines = flyerLines(ev)
  const read = (venueBox: number[]) => lines.map(l => ({ text: l.text, box: l.label === 'venue' ? venueBox : [400, 100, 430, 900] }))
  it('fails the check even when every letter reads', () => {
    const c = checkFlyerText(lines, read([979, 158, 1000, 895]))
    expect(c.missing).toEqual([])
    expect(c.cut).toEqual(['LUMA · NEUHAUSER STR. 47 · MÜNCHEN'])
    expect(c.ok).toBe(false)
  })
  it('passes a line with a margin below it', () => {
    const c = checkFlyerText(lines, read([930, 160, 960, 880]))
    expect(c.cut).toEqual([])
    expect(c.ok).toBe(true)
  })
  it('looks at every edge, and ignores lines without a box', () => {
    expect(edgeCut([{ text: 'top', box: [5, 200, 40, 800] }, { text: 'left', box: [500, 3, 530, 600] }, { text: 'right', box: [500, 300, 530, 995] }, { text: 'none' }])).toEqual(['top', 'left', 'right'])
  })
  it('asks for the cut lines to move in, within the fix’s 500 characters', () => {
    expect(edgeFixNote(['LUMA'])).toBe('Move this line in from the edge, fully inside the poster: "LUMA". Keep the top 4% and the bottom 6% free of text.')
    expect(edgeFixNote(Array.from({ length: 30 }, () => 'A LONG LOCATION LINE HERE')).length).toBeLessThanOrEqual(500)
  })
})

describe('programmeLines', () => {
  it('gives each item its end, from its length, past midnight too', () => {
    expect(programmeLines([{ date: '2026-11-26', time: '21:00', title: 'Party', duration: 180 }, { date: '2026-11-26', time: '19:00', title: 'Class', duration: 60 }]))
      .toEqual([{ time: '19:00', what: 'Class', end: '20:00' }, { time: '21:00', what: 'Party', end: '00:00' }])
  })
})

describe('a line painted twice', () => {
  it('is flagged, not failed', () => {
    const lines = flyerLines(ev)
    const c = checkFlyerText(lines, [...lines.map(l => l.text), 'TIMBA × BACHATA'])
    expect(c.ok).toBe(true)
    expect(c.extra).toEqual(['TIMBA × BACHATA (twice)'])
  })
})

describe('a festival over several days', () => {
  it('shows the dates and no time', () => {
    const lines = flyerLines({ name: 'Menéate Viena', startDate: '2026-11-26T20:00:00Z', endDate: '2026-11-29T22:59:00Z', timezone: 'Europe/Vienna', artists: [] })
    expect(lines.map(l => l.text)).toEqual(['MENÉATE VIENA', '26 – 29 NOVEMBER'])
  })
  it('spans months', () => {
    const lines = flyerLines({ name: 'X', startDate: '2026-10-30T10:00:00Z', endDate: '2026-11-01T20:00:00Z', timezone: 'Europe/Berlin', artists: [] })
    expect(lines[1]!.text).toBe('30 OCTOBER – 1 NOVEMBER')
  })
  it('a night past midnight is still one night', () => {
    const lines = flyerLines({ name: 'X', startDate: '2026-10-15T20:00:00Z', endDate: '2026-10-16T01:00:00Z', timezone: 'Europe/Berlin', artists: [] })
    expect(lines.map(l => l.label)).toEqual(['title', 'date', 'time'])
  })
})
