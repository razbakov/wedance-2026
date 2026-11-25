import { describe, expect, it } from 'vitest'
import { artistBookingBlueprint as bp } from './blueprint-artist-booking'
import { jobs } from './jobs'

describe('artist booking blueprint (J5)', () => {
  it('has unique step ids on known lanes and phases', () => {
    const ids = bp.steps.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const lanes = new Set(bp.lanes.map(l => l.key))
    const phases = new Set(bp.phases.map(p => p.key))
    expect(bp.steps.filter(s => !lanes.has(s.lane) || !phases.has(s.phase))).toEqual([])
  })

  it('lights up only steps that exist, and every phase has a step', () => {
    const ids = new Set(bp.steps.map(s => s.id))
    expect(bp.gaps.flatMap(g => g.steps).filter(id => !ids.has(id))).toEqual([])
    expect(bp.phases.filter(p => !bp.steps.some(s => s.phase === p.key))).toEqual([])
  })

  it('shows a song list, services and the artist’s own pricing on the page', () => {
    const profile = bp.steps.find(s => s.id === 'profile')!
    expect(profile.note).toMatch(/song list/)
    expect(profile.note).toMatch(/pricing note/)
    expect(profile.note).toMatch(/no price is invented/)
    expect(profile.status).toBe('live')
  })

  it('is linked from job J5', () => {
    expect(jobs.find(j => j.id === 'J5')?.flows).toContainEqual(expect.objectContaining({ to: '/docs/blueprints/artist-booking' }))
  })
})
