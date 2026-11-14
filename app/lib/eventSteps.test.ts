import { describe, it, expect } from 'vitest'
import { eventSteps, firstOpenStep, nextStep, pastEventHints } from './eventSteps'

describe('eventSteps', () => {
  it('runs in the order an organiser decides', () => {
    expect(eventSteps({}).map(s => s.key)).toEqual(['when', 'where', 'lineup', 'entry', 'flyer', 'publish'])
  })

  it('a fresh draft from scratch: only "what and when" is done', () => {
    const steps = eventSteps({ date: '2026-11-19', startTime: '20:00', published: false, gaps: [{ key: 'cover' }, { key: 'ticket' }, { key: 'venue' }, { key: 'lineup' }], flyer: { ready: 0, kept: false } })
    expect(steps.filter(s => s.done).map(s => s.key)).toEqual(['when'])
    expect(firstOpenStep(steps)).toBe('where')
    expect(nextStep(steps, 'where')).toBe('lineup')
  })

  it('a copied event with a venue and line-up starts at entry', () => {
    const steps = eventSteps({ date: '2026-11-19', startTime: '20:00', gaps: [{ key: 'ticket' }], flyer: { ready: 0, kept: false } })
    expect(firstOpenStep(steps)).toBe('entry')
    expect(nextStep(steps, 'entry')).toBe('flyer')
  })

  it('a flyer counts once one is ready; all done → the last step', () => {
    const steps = eventSteps({ date: '2026-11-19', startTime: '20:00', published: true, gaps: [], flyer: { ready: 1, kept: false } })
    expect(steps.every(s => s.done)).toBe(true)
    expect(firstOpenStep(steps)).toBe('publish')
    expect(nextStep(steps, 'publish')).toBeNull()
  })
})

describe('pastEventHints', () => {
  const events = [
    { id: 'a', startDate: '2026-10-01T18:00:00Z', artists: ['dj-papi', 'yunior'], price: '10€' },
    { id: 'b', startDate: '2026-10-08T18:00:00Z', artists: ['dj-papi'], price: '' },
    { id: 'c', startDate: '2026-10-15T18:00:00Z', artists: ['alosha'], price: 'Free until 21:00\n12€ after', role: 'artist' },
    { id: 'now', startDate: '2026-11-19T19:00:00Z', artists: ['zzz'], price: '99€' },
  ]
  it('suggests artists the host booked, most often first, not already on it', () => {
    expect(pastEventHints(events, { id: 'now', artists: ['yunior'] }).artists).toEqual(['dj-papi'])
    expect(pastEventHints(events, { id: 'now' }).artists).toEqual(['dj-papi', 'yunior'])
  })
  it('takes the latest price of the host’s own events', () => {
    expect(pastEventHints(events, { id: 'now' }).price).toBe('10€')
    expect(pastEventHints([], {}).price).toBeNull()
  })
})
