import { describe, expect, it } from 'vitest'
import { festivalTravelBlueprint as bp } from './blueprint-festival-travel'
import { jobs } from './jobs'

describe('festival travel blueprint (J4)', () => {
  it('puts every step in a known lane and phase, with a unique id', () => {
    const lanes = new Set(bp.lanes.map(l => l.key))
    const phases = new Set(bp.phases.map(p => p.key))
    for (const s of bp.steps) {
      expect(lanes.has(s.lane), s.id).toBe(true)
      expect(phases.has(s.phase), s.id).toBe(true)
    }
    expect(new Set(bp.steps.map(s => s.id)).size).toBe(bp.steps.length)
  })

  it('has something in every phase', () => {
    for (const p of bp.phases) expect(bp.steps.some(s => s.phase === p.key), p.key).toBe(true)
  })

  it('lights up only steps that exist', () => {
    const ids = new Set(bp.steps.map(s => s.id))
    expect(bp.gaps.length).toBeGreaterThanOrEqual(3)
    for (const g of bp.gaps) {
      expect(g.steps.length, g.title).toBeGreaterThan(0)
      for (const id of g.steps) expect(ids.has(id), `${g.title}: ${id}`).toBe(true)
    }
  })

  it('is linked from job J4', () => {
    const j4 = jobs.find(j => j.id === 'J4')!
    expect(j4.flows.map(f => f.to)).toContain('/docs/blueprints/festival-travel')
  })
})
