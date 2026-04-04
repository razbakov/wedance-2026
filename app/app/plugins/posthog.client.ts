/**
 * PostHog analytics plugin (client-side only).
 *
 * Initializes PostHog with the project API key from environment variables.
 * Captures UTM parameters from the URL on first visit.
 * Provides the PostHog instance via Nuxt's `$posthog` injection.
 *
 * Environment variable: NUXT_PUBLIC_POSTHOG_KEY
 * - Set in .env for local dev, in Vercel for production.
 * - If empty/missing, PostHog is not initialized (safe for dev).
 */
import posthog from 'posthog-js'

export default defineNuxtPlugin({
  name: 'posthog',
  parallel: true,
  setup(nuxtApp) {
    const config = useRuntimeConfig()
    const posthogKey = config.public.posthogKey as string

    // Do not initialize if the key is not configured
    if (!posthogKey) {
      console.warn('[posthog] NUXT_PUBLIC_POSTHOG_KEY not set — analytics disabled')
      return
    }

    posthog.init(posthogKey, {
      // PostHog Cloud ingestion endpoint
      api_host: 'https://eu.i.posthog.com',
      // Respect user privacy: no autocapture, no session recording for MVP
      autocapture: false,
      capture_pageview: false, // We fire $pageview manually via router hook
      capture_pageleave: true,
      disable_session_recording: true,
      // Persist across sessions for return_visit detection
      persistence: 'localStorage+cookie',
      // Load feature flags only when needed
      advanced_disable_feature_flags: true,
    })

    // Capture UTM parameters from the URL on first load.
    // PostHog reads UTMs automatically from the URL, but we also store them
    // as person/super properties so every subsequent event carries them.
    captureUtmParams()

    // Auto-track page views on route changes
    const router = useRouter()
    router.afterEach((to) => {
      // Wait for next tick to ensure the page title has been updated
      nextTick(() => {
        posthog.capture('$pageview', {
          $current_url: to.fullPath,
        })
      })
    })

    return {
      provide: {
        posthog,
      },
    }
  },
})

/**
 * Extract UTM parameters from the current URL and register them as
 * super properties so they are attached to every event in this session.
 */
function captureUtmParams() {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
  const utms: Record<string, string> = {}

  for (const key of utmKeys) {
    const value = params.get(key)
    if (value) {
      utms[key] = value
    }
  }

  // Also capture the referrer as referrer_source
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer)
      utms.referrer_source = refUrl.hostname
    } catch {
      utms.referrer_source = document.referrer
    }
  }

  if (Object.keys(utms).length > 0) {
    posthog.register(utms)
  }
}
