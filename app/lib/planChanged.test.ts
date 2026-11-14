import { describe, it, expect, vi } from 'vitest'
import { isPlanMutation, notifyPlanChanged, onPlanChanged } from './planChanged'

describe('planChanged (RAZ-889)', () => {
  it('flags the mutations that change what /my-plan lists', () => {
    for (const p of ['plan.add', 'plan.remove', 'plan.updateMetadata', 'rsvp.answer', 'weekend.join']) {
      expect(isPlanMutation('mutation', p)).toBe(true)
    }
  })

  it('ignores queries and unrelated mutations', () => {
    expect(isPlanMutation('query', 'plan.add')).toBe(false)
    expect(isPlanMutation('query', 'plan.counts')).toBe(false)
    expect(isPlanMutation('mutation', 'plan.setShareGoing')).toBe(false)
    expect(isPlanMutation('mutation', 'auth.login')).toBe(false)
  })

  it('notifies subscribers until they unsubscribe, and one failing listener does not stop the rest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = vi.fn(() => { throw new Error('boom') })
    const good = vi.fn()
    const offBad = onPlanChanged(bad)
    const offGood = onPlanChanged(good)
    notifyPlanChanged()
    expect(good).toHaveBeenCalledTimes(1)
    offBad(); offGood()
    notifyPlanChanged()
    expect(good).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })
})
