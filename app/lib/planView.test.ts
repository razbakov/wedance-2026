import { describe, it, expect } from 'vitest'
import { planView, authPending } from './planView'

describe('planView — no empty state while the plan loads (RAZ-890)', () => {
  it('shows loading, not the empty state, while the plan is in flight', () => {
    expect(planView({ signedIn: true, authPending: false, loaded: false, empty: true })).toBe('loading')
  })

  it('shows the empty state only once the plan has loaded and is empty', () => {
    expect(planView({ signedIn: true, authPending: false, loaded: true, empty: true })).toBe('empty')
  })

  it('shows the plan once it has loaded with items', () => {
    expect(planView({ signedIn: true, authPending: false, loaded: true, empty: false })).toBe('plan')
  })

  it('shows loading while the session is still restoring', () => {
    expect(planView({ signedIn: false, authPending: true, loaded: false, empty: true })).toBe('loading')
  })

  it('shows the signed-out pitch when there is no session', () => {
    expect(planView({ signedIn: false, authPending: false, loaded: false, empty: true })).toBe('signed-out')
  })
})

describe('authPending', () => {
  it('on the server, trusts the auth-hint cookie', () => {
    expect(authPending({ server: true, hasHint: true, authLoading: true })).toBe(true)
    expect(authPending({ server: true, hasHint: false, authLoading: true })).toBe(false)
  })

  it('on the client, waits for auth.me', () => {
    expect(authPending({ server: false, hasHint: true, authLoading: true })).toBe(true)
    expect(authPending({ server: false, hasHint: true, authLoading: false })).toBe(false)
  })
})
