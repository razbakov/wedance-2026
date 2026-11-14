import { describe, expect, it } from 'vitest'
import { blankBusinessEvent, toBusinessEventInput } from './businessEvent'

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
