import { describe, it, expect } from 'vitest'
import { friendlyError } from './friendlyError'

const FALLBACK = 'Something went wrong. Please try again.'
const SQL = 'Failed query: select "dancer_id" from "sessions" params: secret-token'

describe('friendlyError', () => {
  it('shows the server message for an expected error', () => {
    expect(friendlyError({ message: 'Invalid email or password.', data: { code: 'UNAUTHORIZED' } })).toBe('Invalid email or password.')
    expect(friendlyError({ message: 'Email already in use.', data: { code: 'CONFLICT' } })).toBe('Email already in use.')
    expect(friendlyError({ message: 'Enter a valid email.', data: { code: 'BAD_REQUEST' } })).toBe('Enter a valid email.')
  })

  it('shows the sanitised internal message when it carries a reference', () => {
    const message = 'Something went wrong on our side. Please try again. If it keeps happening, contact us with reference ab12cd34.'
    expect(friendlyError({ message, data: { code: 'INTERNAL_SERVER_ERROR', ref: 'ab12cd34' } })).toBe(message)
  })

  it('hides an internal error that has no reference', () => {
    const shown = friendlyError({ message: SQL, data: { code: 'INTERNAL_SERVER_ERROR' } })
    expect(shown).toBe(FALLBACK)
    expect(shown).not.toContain('secret-token')
  })

  it('uses the fallback when the failure is not a tRPC error', () => {
    expect(friendlyError({ message: 'Failed to fetch' })).toBe(FALLBACK)
    expect(friendlyError({ data: { code: 'UNAUTHORIZED' } })).toBe(FALLBACK)
    expect(friendlyError({ message: '', data: { code: 'BAD_REQUEST' } })).toBe(FALLBACK)
    expect(friendlyError(null)).toBe(FALLBACK)
    expect(friendlyError(undefined)).toBe(FALLBACK)
  })
})
