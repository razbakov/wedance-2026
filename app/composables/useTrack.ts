import posthog from 'posthog-js'

/**
 * Thin analytics wrapper so call sites don't import posthog directly and don't
 * have to guard for SSR / un-keyed environments. Every method is a no-op unless
 * PostHog actually initialized (client-side + a key present). This keeps event
 * calls sprinkled through pages/components harmless in dev and tests.
 *
 * Event names + property shapes are the WeDance 2026 CUJ funnel — see the
 * "Critical User Journeys" spreadsheet. Keep names snake_case and stable.
 */
export type TrackProps = Record<string, unknown>

function ready(): boolean {
  return import.meta.client && !!(posthog as any).__loaded
}

export function useTrack() {
  const track = (event: string, props?: TrackProps) => {
    if (!ready()) return
    posthog.capture(event, props)
  }

  // Tie subsequent events to a known dancer (call on sign-in / verified).
  const identify = (distinctId: string, props?: TrackProps) => {
    if (!ready()) return
    posthog.identify(distinctId, props)
  }

  // Clear identity on sign-out so events aren't attributed across accounts.
  const reset = () => {
    if (!ready()) return
    posthog.reset()
  }

  return { track, identify, reset }
}
