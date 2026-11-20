import { describe, it, expect } from 'vitest'
import { cleanStoryLine, partyAccent, partyFamily, partyStyleLabel, pickStoryLine, storyLines, STORY_LINE_MAX } from './storyLines'

describe('storyLines', () => {
  it('reads the family from the name before the tags', () => {
    expect(partyFamily({ name: 'Samstags Salsa Cubana Party im Megano', styles: ['Salsa'] })).toBe('cuban')
    expect(partyFamily({ name: 'Kasonga — Kizomba Party', styles: [] })).toBe('kizomba')
    expect(partyFamily({ name: 'Friday night', styles: ['Bachata'] })).toBe('bachata')
    expect(partyFamily({ name: 'Friday night', styles: [] })).toBeNull()
  })

  it('labels the card with the style its name says', () => {
    expect(partyStyleLabel({ name: 'Samstags Salsa Cubana Party im Megano', styles: ['Salsa'] })).toBe('Casino')
    expect(partyStyleLabel({ name: 'Friday night', styles: ['Bachata'] })).toBe('Bachata')
    expect(partyStyleLabel({ name: 'Friday night', styles: [] })).toBe('')
  })

  it('gives a colour for known styles only', () => {
    expect(partyAccent({ name: 'x', styles: ['Bachata'] })).toMatch(/^#[0-9a-f]{6}$/)
    expect(partyAccent({ name: 'x', styles: ['nothing-known'] })).toBeNull()
  })

  it('uses the first party’s lines, else the any-style ones', () => {
    const cuban = storyLines([{ name: 'Salsa Cubana Party', styles: [] }])
    expect(cuban.some(l => /timba|Rueda|Casino|Cuban/.test(l))).toBe(true)
    expect(storyLines([])).toContain('Shoes in the bag. See you on the floor.')
    for (const l of [...cuban, ...storyLines([])]) expect(l.length).toBeLessThanOrEqual(STORY_LINE_MAX)
  })

  it('shuffles to a different line', () => {
    const parties = [{ name: 'x', styles: ['Kizomba'] }]
    const first = pickStoryLine(parties, '', () => 0)
    for (let i = 0; i < 20; i++) expect(pickStoryLine(parties, first)).not.toBe(first)
  })

  it('cleans the sharer’s own line', () => {
    expect(cleanStoryLine('  Who’s\ncoming   to Megano? ')).toBe('Who’s coming to Megano?')
    expect(cleanStoryLine('a'.repeat(100))).toHaveLength(STORY_LINE_MAX)
  })
})
