/**
 * "The dancer's plan changed" — RAZ-889. The My plan badge and the city page's
 * "in your week" pill come from `plan.counts`, so they must be refetched after
 * anything that adds to or removes from the plan. Plans are written from many
 * places (Going on a city / event page, an RSVP poll, a festival, the discover
 * deck, a weekend share, a course picker…), so the tRPC client tells us after
 * any of these mutations succeeds instead of each call site remembering to.
 */

/** tRPC mutations that can change what /my-plan lists. */
export const PLAN_MUTATIONS = new Set([
  'plan.add',
  'plan.remove',
  'plan.updateMetadata', // a course ↔ social switch moves it between sections
  'rsvp.answer',
  'weekend.join',
])

export function isPlanMutation(type: string, path: string): boolean {
  return type === 'mutation' && PLAN_MUTATIONS.has(path)
}

const listeners = new Set<() => void>()

/** Subscribe; returns the unsubscribe function. */
export function onPlanChanged(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyPlanChanged() {
  for (const fn of listeners) {
    try { fn() }
    catch (err) { console.warn('[planChanged] listener failed:', err) }
  }
}
