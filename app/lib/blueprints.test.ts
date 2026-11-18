import { describe, expect, it } from 'vitest'
import {
  CLOSED_BLUEPRINT_ISSUES,
  closedIssuesOnOpenSteps,
  linearRefs,
  serviceBlueprints,
} from './blueprint-issues'
import { jobs } from './jobs'

const closed = new Set(CLOSED_BLUEPRINT_ISSUES)

describe('service blueprints', () => {
  it('covers the seven journeys, each linked from its job', () => {
    expect(serviceBlueprints.map(b => b.id)).toEqual([
      'first-class', 'keep-progressing', 'meet-friends', 'festival-travel', 'artist-booking', 'event-setup', 'make-it-real',
    ])
    for (const b of serviceBlueprints) {
      const job = jobs.find(j => j.id === b.job)
      expect(job?.flows.map(f => f.to), b.id).toContain(b.to)
      expect(b.bp.updated, b.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('puts every step on a known lane and phase, with a unique id, and a step in every phase', () => {
    for (const b of serviceBlueprints) {
      const lanes = new Set(b.bp.lanes.map(l => l.key))
      const phases = new Set(b.bp.phases.map(p => p.key))
      const ids = b.bp.steps.map(s => s.id)
      expect(new Set(ids).size, b.id).toBe(ids.length)
      expect(b.bp.steps.filter(s => !lanes.has(s.lane) || !phases.has(s.phase)), b.id).toEqual([])
      expect(b.bp.phases.filter(p => !b.bp.steps.some(s => s.phase === p.key)), b.id).toEqual([])
    }
  })

  it('lights up only steps that exist', () => {
    for (const b of serviceBlueprints) {
      const ids = new Set(b.bp.steps.map(s => s.id))
      expect(b.bp.gaps.length, b.id).toBeGreaterThan(0)
      for (const g of b.bp.gaps) {
        expect(g.steps.length, `${b.id}: ${g.title}`).toBeGreaterThan(0)
        expect(g.steps.filter(id => !ids.has(id)), `${b.id}: ${g.title}`).toEqual([])
      }
    }
  })

  it('fails when an unfinished step cites an issue that is Done or Canceled', () => {
    const hits = serviceBlueprints.flatMap(b =>
      closedIssuesOnOpenSteps(b.bp.steps, closed).map(h => `${b.id}:${h.id} (${h.status}) cites ${h.issue}`))
    expect(hits).toEqual([])
    // The list is the closed issues the steps still cite — not a junk drawer, and not missing one they cite.
    const cited = new Set(serviceBlueprints.flatMap(b => linearRefs(b.bp.steps)))
    expect(CLOSED_BLUEPRINT_ISSUES.filter(id => !cited.has(id))).toEqual([])
  })

  it('treats a closed issue on a partial step as drift, and a live step as fine', () => {
    const steps = [
      { id: 'told', phase: 'match', lane: 'other', name: 'Told', status: 'partial' as const, note: '', marks: [], refs: ['RAZ-985'] },
      { id: 'shipped', phase: 'match', lane: 'me', name: 'Shipped', status: 'live' as const, note: '', marks: [], refs: ['RAZ-985'] },
      { id: 'pr', phase: 'match', lane: 'me', name: 'PR', status: 'partial' as const, note: '', marks: [], refs: ['#636'] },
    ]
    expect(closedIssuesOnOpenSteps(steps, new Set(['RAZ-985'])).map(h => h.id)).toEqual(['told'])
  })

  it('records the shipped match email, draft-first events, the answer bar and the review ask', () => {
    const meet = serviceBlueprints.find(b => b.id === 'meet-friends')!
    const told = meet.bp.steps.find(s => s.id === 'match-them')!
    expect(told.status).toBe('live')
    expect(told.marks).not.toContain('silent')
    expect(told.note).toMatch(/said yes too/)
    expect(meet.bp.gaps.map(g => g.fix).join('\n')).not.toMatch(/Ship RAZ-985/)

    const setup = serviceBlueprints.find(b => b.id === 'event-setup')!
    expect(setup.bp.steps.find(s => s.id === 'publish')!.note).not.toMatch(/live from the first save/)
    expect(setup.bp.steps.find(s => s.id === 'ask-answer')!.note).toMatch(/above the tab bar/)
    expect(setup.bp.steps.find(s => s.id === 'invite-answer')!.note).toMatch(/above the tab bar/)
    expect(setup.bp.steps.find(s => s.id === 'after')!.status).not.toBe('missing')

    const artist = serviceBlueprints.find(b => b.id === 'artist-booking')!
    expect(artist.bp.steps.find(s => s.id === 'review')!.status).not.toBe('missing')
    const first = serviceBlueprints.find(b => b.id === 'first-class')!
    expect(first.bp.steps.find(s => s.id === 'follow-up')!.note).toMatch(/How was it/)
    expect(first.bp.steps.find(s => s.id === 'reminder')!.note).not.toMatch(/no cron/)
  })
})
