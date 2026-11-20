import { describe, it, expect } from 'vitest'
import { cleanGuestName, firstName, joinersLine, newWeekendCode, sameEventSet, storyParties, weekendKey, WEEKEND_CODE_RE } from './weekendShare'

describe('weekendShare', () => {
  it('makes 7-char codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) expect(newWeekendCode()).toMatch(WEEKEND_CODE_RE)
    expect(newWeekendCode(() => 0)).toBe('aaaaaaa')
    expect(newWeekendCode()).not.toMatch(/[01ilo]/)
  })

  it('keeps first names only', () => {
    expect(firstName('Alex Razbakov')).toBe('Alex')
    expect(firstName('  Marta ')).toBe('Marta')
    expect(firstName(null)).toBe('')
  })

  it('cleans guest names', () => {
    expect(cleanGuestName('  Jo   Ann ')).toBe('Jo Ann')
    expect(cleanGuestName('<script>x')).toBe('scriptx')
    expect(cleanGuestName('   ')).toBe('')
    expect(cleanGuestName('a'.repeat(60))).toHaveLength(40)
  })

  it('compares party sets ignoring order', () => {
    expect(sameEventSet(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameEventSet(['a'], ['a', 'b'])).toBe(false)
    expect(sameEventSet(['a', 'b'], ['a', 'c'])).toBe(false)
  })

  it('says who is coming', () => {
    expect(joinersLine([])).toBe('')
    expect(joinersLine(['Marta'])).toBe('Marta')
    expect(joinersLine(['Marta', 'Jo'])).toBe('Marta and Jo')
    expect(joinersLine(['Marta', 'Jo', 'Ana'])).toBe('Marta, Jo and 1 other')
    expect(joinersLine(['Marta', 'Jo', 'Ana', 'Li'])).toBe('Marta, Jo and 2 others')
  })

  it('puts the parties still to come on the story, else every one', () => {
    const a = { id: 'a', ended: true }
    const b = { id: 'b', ended: false }
    expect(storyParties([a, b])).toEqual([b])
    expect(storyParties([a])).toEqual([a])
    expect(storyParties([])).toEqual([])
  })

  it('keys a set of parties regardless of order or repeats', () => {
    expect(weekendKey(['b', 'a', 'b'])).toBe(weekendKey(['a', 'b']))
    expect(weekendKey(['a'])).not.toBe(weekendKey(['a', 'b']))
    expect(weekendKey([])).toBe('')
  })
})
