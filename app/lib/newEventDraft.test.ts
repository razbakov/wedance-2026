import { describe, expect, it } from 'vitest'
import {
  NEW_EVENT_DRAFT_KEY,
  clearNewEventDraft,
  isNewEventChoiceUrl,
  newEventBackAction,
  newEventRestorePlan,
  nextNewEventDraft,
  parseNewEventDraft,
  readNewEventDraft,
  writeNewEventDraft,
  type NewEventDraft,
} from './newEventDraft'

const bare = { type: null, artist: '' }
const festival = { type: 'Festival', artist: '' }

function draft(over: Partial<NewEventDraft> = {}): NewEventDraft {
  return {
    v: 1,
    start: 'scratch',
    entry: bare,
    post: { url: '', profile: '' },
    copy: { id: '', date: '', repeatWeeks: 0 },
    scratch: {
      hostUsername: 'salsea',
      type: 'Party',
      styles: ['Salsa'],
      date: '2026-11-26',
      startTime: '21:00',
      name: 'Thursday social',
      published: false,
    },
    naming: true,
    ...over,
  }
}

const none = { post: false, copy: false, scratch: false }

describe('new event history (RAZ-1024)', () => {
  it('treats the choice URL as a step, and a path as not the choice', () => {
    expect(isNewEventChoiceUrl('/business/events/new')).toBe(true)
    expect(isNewEventChoiceUrl('/business/events/new/')).toBe(true)
    expect(isNewEventChoiceUrl('/business/events/new?type=Festival')).toBe(true)
    expect(isNewEventChoiceUrl('/business/events/new?artist=ada&type=Party')).toBe(true)
    expect(isNewEventChoiceUrl('/business/events/new?type=Festival#x')).toBe(true)
    expect(isNewEventChoiceUrl('/business/events/new?start=scratch')).toBe(false)
    expect(isNewEventChoiceUrl('/business/events/new?start=post&type=Festival')).toBe(false)
    expect(isNewEventChoiceUrl('/business/events')).toBe(false)
    expect(isNewEventChoiceUrl('/business/events/new/extra')).toBe(false)
    expect(isNewEventChoiceUrl('https://2026.wedance.vip/business/events/new')).toBe(false)
    expect(isNewEventChoiceUrl(null)).toBe(false)
  })

  it('uses history when the previous entry is the choice, and opens the choice otherwise', () => {
    expect(newEventBackAction('/business/events/new')).toBe('back')
    expect(newEventBackAction('/business/events/new?type=Festival')).toBe('back')
    expect(newEventBackAction('/business/events/new?start=post')).toBe('push')
    expect(newEventBackAction('/business/events')).toBe('push')
    expect(newEventBackAction(null)).toBe('push')
  })
})

describe('new event restore (RAZ-1024)', () => {
  it('opens a saved path on an ordinary visit and puts the fields back', () => {
    const plan = newEventRestorePlan(draft({ start: 'post' }), bare, null)
    expect(plan).toEqual({ applyPost: true, applyCopy: true, applyScratch: true, open: 'post' })
  })

  it('stays on the choice when the organiser had gone back', () => {
    const plan = newEventRestorePlan(draft({ start: null }), bare, null)
    expect(plan.open).toBeNull()
    expect(plan.applyScratch).toBe(true)
  })

  it('keeps a path the URL already names', () => {
    const plan = newEventRestorePlan(draft({ start: 'post' }), bare, 'scratch')
    expect(plan.open).toBeNull()
    expect(plan.applyScratch).toBe(true)
  })

  it('opens From scratch from a type or artist link without replacing a different draft', () => {
    const fresh = newEventRestorePlan(null, festival, null)
    expect(fresh).toEqual({ applyPost: false, applyCopy: false, applyScratch: false, open: 'scratch' })

    const other = newEventRestorePlan(draft(), festival, null)
    expect(other).toEqual({ applyPost: true, applyCopy: true, applyScratch: false, open: 'scratch' })
  })

  it('continues a festival draft when they come back through the same link', () => {
    const saved = draft({ entry: festival, scratch: { ...draft().scratch, type: 'Festival' } })
    const plan = newEventRestorePlan(saved, festival, null)
    expect(plan.applyScratch).toBe(true)
    expect(plan.open).toBe('scratch')
  })

  it('does not store an empty choice, and stores a path once it is chosen', () => {
    const empty = draft({
      start: null,
      scratch: { hostUsername: '', type: 'Party', styles: [], date: '', startTime: '20:00', name: '', published: false },
      naming: false,
    })
    expect(nextNewEventDraft(null, empty, none)).toBeNull()
    expect(nextNewEventDraft(null, { ...empty, start: 'scratch' }, none)?.start).toBe('scratch')
  })

  it('keeps every path when the organiser goes back to the choice', () => {
    const saved = draft({
      start: 'post',
      post: { url: 'https://www.instagram.com/p/abc/', profile: 'salsea' },
    })
    const back = nextNewEventDraft(saved, { ...saved, start: null }, { post: true, copy: false, scratch: false })
    expect(back?.start).toBeNull()
    expect(back?.post.url).toBe('https://www.instagram.com/p/abc/')
    expect(back?.scratch.name).toBe('Thursday social')
  })

  it('does not throw away an ordinary draft when a festival link is opened and not typed in', () => {
    const saved = draft({ start: 'copy', copy: { id: 'ev-1', date: '2026-12-03', repeatWeeks: 2 } })
    const looking = draft({
      start: 'scratch',
      entry: festival,
      scratch: { hostUsername: '', type: 'Festival', styles: [], date: '', startTime: '20:00', name: '', published: false },
      naming: false,
    })
    const next = nextNewEventDraft(saved, looking, none)
    expect(next).toEqual(saved)
  })

  it('keeps the other paths when the festival form is typed in', () => {
    const saved = draft({
      start: 'post',
      post: { url: 'https://www.instagram.com/p/abc/', profile: 'salsea' },
    })
    const typed = draft({
      start: 'scratch',
      entry: festival,
      post: { url: '', profile: '' },
      scratch: { ...draft().scratch, type: 'Festival', date: '2026-12-10', name: '' },
      naming: false,
    })
    const next = nextNewEventDraft(saved, typed, { post: false, copy: false, scratch: true })
    expect(next?.entry).toEqual(festival)
    expect(next?.scratch.date).toBe('2026-12-10')
    expect(next?.scratch.type).toBe('Festival')
    expect(next?.post.url).toBe('https://www.instagram.com/p/abc/')
    expect(next?.start).toBe('scratch')
  })
})

describe('new event draft storage (RAZ-1024)', () => {
  it('round-trips the fields and drops a broken or oversized value', () => {
    const saved = draft({
      post: { url: '  https://www.instagram.com/p/abc/  ', profile: 'salsea' },
      copy: { id: 'ev-1', date: '2026-12-03', repeatWeeks: 2 },
    })
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value) },
      removeItem: (key: string) => { memory.delete(key) },
    }
    writeNewEventDraft(storage, saved)
    expect(memory.has(NEW_EVENT_DRAFT_KEY)).toBe(true)
    const read = readNewEventDraft(storage)
    expect(read?.post).toEqual({ url: 'https://www.instagram.com/p/abc/', profile: 'salsea' })
    expect(read?.copy).toEqual({ id: 'ev-1', date: '2026-12-03', repeatWeeks: 2 })
    expect(read?.scratch.name).toBe('Thursday social')
    expect(read?.naming).toBe(true)

    expect(parseNewEventDraft('not json')).toBeNull()
    expect(parseNewEventDraft(JSON.stringify({ v: 2 }))).toBeNull()
    expect(parseNewEventDraft(JSON.stringify({ ...saved, scratch: { ...saved.scratch, date: '2026-13-40', startTime: '25:00' } }))?.scratch.date).toBe('')
    expect(parseNewEventDraft(JSON.stringify({ ...saved, copy: { id: 'ev-1', date: '2026-12-03', repeatWeeks: 40 } }))?.copy.repeatWeeks).toBe(12)

    clearNewEventDraft(storage)
    expect(readNewEventDraft(storage)).toBeNull()
  })

  it('keeps a typed name visible and ignores a missing entry', () => {
    const raw = JSON.stringify({
      v: 1,
      start: 'scratch',
      entry: {},
      post: {},
      copy: { repeatWeeks: '3' },
      scratch: { name: 'Salsa night', type: 'Nope', styles: ['Salsa', 4, ''], published: 'yes' },
      naming: false,
    })
    const read = parseNewEventDraft(raw)
    expect(read?.entry).toEqual(bare)
    expect(read?.scratch.type).toBe('Party')
    expect(read?.scratch.styles).toEqual(['Salsa'])
    expect(read?.scratch.published).toBe(false)
    expect(read?.scratch.name).toBe('Salsa night')
    expect(read?.naming).toBe(true)
    expect(read?.copy.repeatWeeks).toBe(3)
    expect(read?.scratch.startTime).toBe('20:00')
  })
})
