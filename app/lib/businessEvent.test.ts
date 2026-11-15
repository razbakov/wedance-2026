import { describe, expect, it } from 'vitest'
import { blankBusinessEvent, lineupSummary, toBusinessEventInput } from './businessEvent'

describe('blankBusinessEvent', () => {
  // RAZ-927: the web form, the Instagram import and the AI app all start drafts.
  it('starts a new event as a draft', () => {
    expect(blankBusinessEvent().published).toBe(false)
  })

  it('sends published: false unless the organiser ticks "Publish it now"', () => {
    const draft = { ...blankBusinessEvent(), hostUsername: 'salsa-club', name: 'Friday Social', date: '2026-11-20' }
    expect(toBusinessEventInput(draft).published).toBe(false)
    expect(toBusinessEventInput({ ...draft, published: true }).published).toBe(true)
  })

  it('returns a fresh object each time', () => {
    const a = blankBusinessEvent()
    a.artists.push('dj-x')
    expect(blankBusinessEvent().artists).toEqual([])
  })
})

// RAZ-988: the Line-up card closes like When / Where and shows this line.
describe('lineupSummary', () => {
  it('says when nobody is on the line-up', () => {
    expect(lineupSummary([])).toBe('No one yet')
  })

  it('names artists as the event names them, else by handle', () => {
    expect(lineupSummary(['george-iva'], { 'george-iva': 'George & Iva' })).toBe('1 artist: George & Iva')
    expect(lineupSummary(['george-iva', 'jeff-ghys'], { 'jeff-ghys': '  ' })).toBe('2 artists: @george-iva, @jeff-ghys')
  })

  it('shows the first few and counts the rest', () => {
    const hs = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6']
    expect(lineupSummary(hs)).toBe('6 artists: @a1, @b2, @c3, @d4 and 2 more')
  })
})
