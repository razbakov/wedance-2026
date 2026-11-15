import { describe, it, expect } from 'vitest'
import { eventErrorCard, eventFieldLabel, readableSaveError, zodIssues } from './eventSaveError'

// The refusal Alex saw on RAZ-991, as the tRPC client hands it over.
const RAZ_991 = JSON.stringify([
  { origin: 'array', code: 'too_big', maximum: 40, inclusive: true, path: ['artists'], message: 'Too big: expected array to have <=40 items' },
  { origin: 'string', code: 'too_big', maximum: 300, inclusive: true, path: ['festival', 'practicalInfo', 11], message: 'Too big: expected string to have <=300 characters' },
], null, 2)

describe('readableSaveError', () => {
  it('turns a zod issue list into sentences naming the fields', () => {
    const r = readableSaveError(new Error(RAZ_991))
    expect(r.message).toBe('Not saved. The line-up has too many entries: keep it to 40. Practical info, line 12 is too long: keep it under 300 characters.')
    expect(r.message).not.toContain('too_big')
    expect(r.paths).toEqual(['artists', 'festival.practicalInfo.11'])
  })

  it('keeps our own messages as they are', () => {
    const msg = JSON.stringify([{ code: 'too_small', origin: 'string', minimum: 1, path: ['festival', 'passes', 0, 'name'], message: 'Name every pass.' }])
    expect(readableSaveError(new Error(msg)).message).toBe('Not saved. Name every pass.')
  })

  it('explains a bad link', () => {
    const msg = JSON.stringify([{ code: 'invalid_format', format: 'url', path: ['ticketUrl'], message: 'Invalid URL' }])
    expect(readableSaveError(new Error(msg)).message).toBe('Not saved. The ticket link isn’t a link: paste the full link, starting with https://')
  })

  it('passes plain server messages through, with a fallback', () => {
    expect(readableSaveError(new Error('You don’t manage this event.'))).toEqual({ message: 'You don’t manage this event.', paths: [] })
    expect(readableSaveError(null, 'Could not save.').message).toBe('Could not save.')
  })
})

describe('zodIssues', () => {
  it('only parses issue lists', () => {
    expect(zodIssues('[1, 2]')).toBeNull()
    expect(zodIssues('[not json')).toBeNull()
    expect(zodIssues(RAZ_991)).toHaveLength(2)
  })
})

describe('event fields', () => {
  it('names a field the way the editor shows it', () => {
    expect(eventFieldLabel(['festival', 'practicalInfo', 0])).toBe('Practical info, line 1')
    expect(eventFieldLabel(['festival', 'passes', 2, 'description'])).toBe('Pass 3, what’s included')
    expect(eventFieldLabel(['artists'])).toBe('The line-up')
  })

  it('finds the card a field lives in', () => {
    expect(eventErrorCard('artists')).toBe('lineup')
    expect(eventErrorCard('festival.practicalInfo.11')).toBe('where')
    expect(eventErrorCard('festival.passes.0.description')).toBe('entry')
    expect(eventErrorCard('festival.sessions.3.title')).toBe('agenda')
    expect(eventErrorCard('mystery')).toBeNull()
  })
})
