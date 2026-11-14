/**
 * Which state My plan / My year shows (RAZ-890).
 *
 * The plan is fetched on the client after hydration (it needs the session), so
 * "nothing loaded yet" and "nothing in the plan" look the same in the data. The
 * empty state ("You haven't picked anything yet") is shown only once the plan
 * has loaded and really is empty; until then the page shows a loading state, so
 * a dancer with a full plan never sees it flash.
 */
export type PlanView = 'signed-out' | 'loading' | 'empty' | 'plan'

export function planView(s: {
  signedIn: boolean
  /** The session may still turn out signed in (see authPending). */
  authPending: boolean
  /** Every query that fills the plan has settled (success or failure). */
  loaded: boolean
  /** The loaded plan holds nothing to show. */
  empty: boolean
}): PlanView {
  if (!s.signedIn) return s.authPending ? 'loading' : 'signed-out'
  if (!s.loaded) return 'loading'
  return s.empty ? 'empty' : 'plan'
}

/**
 * Is the session still unknown? On the server auth never runs, so the
 * `wedance-auth-hint` cookie (set on sign-in, cleared on sign-out) is the only
 * clue: with it, render a loading state instead of the signed-out pitch. On the
 * client, auth.me may still be in flight.
 */
export function authPending(s: { server: boolean; hasHint: boolean; authLoading: boolean }): boolean {
  return s.server ? s.hasHint : s.authLoading
}
