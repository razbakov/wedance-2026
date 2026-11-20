import { describe, expect, it } from 'vitest'
import { emptyFlyerDraft, flyerDraftHasProgress, flyerDraftSchema, landOnSitting, parseFlyerDraft, resumeFlyer, type FlyerDraft } from './flyerDraft'

const batch = '11111111-1111-4111-8111-111111111111'
const flyer = '22222222-2222-4222-8222-222222222222'

function draft(over: Partial<FlyerDraft> = {}): FlyerDraft {
  return { ...emptyFlyerDraft(), ...over, look: { ...emptyFlyerDraft().look, ...over.look } }
}

describe('flyerDraftHasProgress', () => {
  it('is empty on the first question', () => {
    expect(flyerDraftHasProgress(emptyFlyerDraft())).toBe(false)
    expect(flyerDraftHasProgress(null)).toBe(false)
  })

  it('counts uploads, a read look, a path and a sitting', () => {
    expect(flyerDraftHasProgress(draft({ uploads: [{ url: 'https://cdn.example/a.jpg', name: 'a.jpg' }] }))).toBe(true)
    expect(flyerDraftHasProgress(draft({ look: { name: 'Main look', description: 'Warm gold type on a dark street.', palette: [] } }))).toBe(true)
    expect(flyerDraftHasProgress(draft({ path: 'yes' }))).toBe(true)
    expect(flyerDraftHasProgress(draft({ step: 'result', batchId: batch }))).toBe(true)
  })
})

describe('resumeFlyer', () => {
  it('starts at the question when nothing is saved', () => {
    expect(resumeFlyer({}, null)).toEqual({ step: 'ask', batchId: null, explicitBatch: false })
  })

  it('reopens the saved step when the organiser comes back with no query', () => {
    const d = draft({
      step: 'look',
      path: 'yes',
      uploads: [{ url: 'https://cdn.example/a.jpg', name: 'a.jpg' }],
      look: { name: 'Main look', description: 'Warm gold type on a dark street.', palette: [] },
    })
    expect(resumeFlyer({}, d)).toEqual({ step: 'look', batchId: null, explicitBatch: false })
  })

  it('comes back to the sitting stored on the draft', () => {
    expect(resumeFlyer({}, draft({ step: 'result', path: 'yes', batchId: batch }))).toEqual({
      step: 'result', batchId: batch, explicitBatch: false,
    })
  })

  it('a reload keeps the step and the sitting from the URL', () => {
    const d = draft({ step: 'upload', path: 'yes', batchId: batch })
    expect(resumeFlyer({ step: 'upload', batch }, d)).toEqual({ step: 'upload', batchId: batch, explicitBatch: false })
  })

  it('Refresh and Change it open that sitting, not an older draft step', () => {
    const d = draft({ step: 'upload', path: 'yes', uploads: [{ url: 'https://cdn.example/a.jpg', name: 'a.jpg' }] })
    expect(resumeFlyer({ batch, refresh: '1' }, d)).toMatchObject({ step: 'painting', batchId: batch, explicitBatch: true })
    expect(resumeFlyer({ batch, flyer }, d)).toMatchObject({ explicitBatch: true, batchId: batch })
    expect(resumeFlyer({ batch }, null)).toMatchObject({ explicitBatch: true, batchId: batch })
  })
})

describe('landOnSitting', () => {
  it('does not resume Reading as a spinner', () => {
    expect(landOnSitting('reading', [], { lookDescription: '' })).toBe('upload')
    expect(landOnSitting('reading', [], { lookDescription: 'Long enough look.' })).toBe('look')
  })

  it('leaves Painting once the picture is done', () => {
    expect(landOnSitting('painting', [{ mode: 'paint', status: 'painting', url: null }])).toBe('painting')
    expect(landOnSitting('painting', [{ mode: 'paint', status: 'ready', url: 'https://cdn.example/f.jpg' }])).toBe('result')
    expect(landOnSitting('painting', [{ mode: 'direction', status: 'ready', url: 'https://cdn.example/f.jpg' }])).toBe('directions')
    expect(landOnSitting('painting', [{ mode: 'direction', status: 'ready', url: 'https://cdn.example/f.jpg' }], { picked: [flyer] })).toBe('result')
  })

  it('stays on the result the organiser left', () => {
    expect(landOnSitting('result', [{ mode: 'paint', status: 'ready', url: 'https://cdn.example/f.jpg' }])).toBe('result')
    expect(landOnSitting('save', [{ mode: 'paint', status: 'ready', url: 'https://cdn.example/f.jpg' }])).toBe('save')
    expect(landOnSitting('upload', [])).toBe('upload')
  })
})

describe('parseFlyerDraft', () => {
  it('drops a draft that is not ours', () => {
    expect(parseFlyerDraft({ step: 'nope' })).toBeNull()
    expect(parseFlyerDraft(null)).toBeNull()
    expect(flyerDraftSchema.safeParse(draft({ uploads: [{ url: 'javascript:alert(1)', name: 'x' }] })).success).toBe(false)
  })

  it('keeps a draft with uploads', () => {
    const d = draft({ step: 'upload', path: 'yes', uploads: [{ url: 'https://cdn.example/a.jpg', name: 'a.jpg' }] })
    expect(parseFlyerDraft(d)?.uploads).toEqual(d.uploads)
  })
})
