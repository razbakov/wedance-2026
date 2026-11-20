import { describe, it, expect, vi, afterEach } from 'vitest'
import * as Sentry from '@sentry/nuxt'
import { formatTrpcError } from './formatError'

// The text a local sign-in showed in the dialog (RAZ-1075): the SQL and the
// session token. Nothing in the value sent to the browser may contain it.
const SQL = 'Failed query: select "dancer_id" from "sessions" where ("sessions"."token" = $1 and "sessions"."expires_at" > $2) params: secret-token, 2026-01-01T00:00:00.000Z'

const internalShape = () => ({
  message: SQL,
  code: -32603,
  data: {
    code: 'INTERNAL_SERVER_ERROR' as const,
    httpStatus: 500,
    path: 'auth.login',
    stack: `Error: ${SQL}\n    at Query.query`,
  },
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formatTrpcError', () => {
  it('leaves expected errors unchanged', () => {
    const shape = {
      message: 'Invalid email or password.',
      code: -32001,
      data: { code: 'UNAUTHORIZED' as const, httpStatus: 401, stack: 'Error: Invalid email or password.' },
    }
    const report = vi.fn()
    expect(formatTrpcError({ shape, error: { code: 'UNAUTHORIZED' }, path: 'auth.login', report })).toBe(shape)
    expect(report).not.toHaveBeenCalled()
  })

  it('replaces an internal error with a reference and hides the query', () => {
    const cause = new Error(SQL)
    const report = vi.fn()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const out = formatTrpcError({
      shape: internalShape(),
      error: { code: 'INTERNAL_SERVER_ERROR', cause },
      path: 'auth.login',
      report,
    })

    expect(out.message).toMatch(/^Something went wrong on our side\. Please try again\. If it keeps happening, contact us with reference [0-9a-f]{8}\.$/)
    expect(out.data.ref).toHaveLength(8)
    expect(out.message).toContain(out.data.ref)
    expect(out.data.stack).toBeUndefined()
    expect(out.data.code).toBe('INTERNAL_SERVER_ERROR')
    expect(out.data.httpStatus).toBe(500)

    const wire = JSON.stringify(out)
    expect(wire).not.toContain('secret-token')
    expect(wire).not.toContain('Failed query')
    expect(wire).not.toContain('sessions')

    expect(log).toHaveBeenCalledWith(`[trpc] auth.login failed (ref ${out.data.ref}):`, cause)
    expect(report).toHaveBeenCalledWith(cause, { trpc_path: 'auth.login', error_ref: out.data.ref })
  })

  it('still returns the friendly message when Sentry is not initialised', () => {
    expect(Sentry.isInitialized()).toBe(false)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error(SQL)
    const out = formatTrpcError({
      shape: internalShape(),
      error: { code: 'INTERNAL_SERVER_ERROR', cause },
      path: undefined,
    })
    expect(out.message).toContain(`reference ${out.data.ref}`)
    expect(JSON.stringify(out)).not.toContain('secret-token')
    expect(log).toHaveBeenCalledWith(`[trpc] ? failed (ref ${out.data.ref}):`, cause)
  })
})
