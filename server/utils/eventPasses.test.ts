import { describe, it, expect } from 'vitest'
import { passPriceCents } from './eventPasses'

describe('passPriceCents', () => {
  const passes = [
    { name: 'Full Pass', price: 89.5, days: [] },
    { name: 'Party Pass ', price: 25, days: [], soldOut: true },
  ]
  it('turns the euro price into cents', () => {
    expect(passPriceCents(passes, 'Full Pass')).toEqual({ priceCents: 8950, soldOut: false })
  })
  it('matches names ignoring surrounding spaces and keeps sold out', () => {
    expect(passPriceCents(passes, 'Party Pass')).toEqual({ priceCents: 2500, soldOut: true })
  })
  it('returns null for an unknown pass', () => {
    expect(passPriceCents(passes, 'VIP')).toBeNull()
  })
})
