import posthog from 'posthog-js'

/**
 * PostHog product analytics — client only. Initializes once with the public
 * ingest key. When the key is empty (dev, or before the key is wired) this is
 * a complete no-op: `useTrack()` guards on `posthog.__loaded`, so no events and
 * no network calls happen. Pageviews are captured manually on route change
 * because Nuxt is an SPA after first load.
 */
export default defineNuxtPlugin({
  name: 'posthog',
  setup() {
    const { public: { posthogKey, posthogHost } } = useRuntimeConfig()
    if (!posthogKey) return

    posthog.init(posthogKey as string, {
      api_host: posthogHost as string,
      person_profiles: 'identified_only',
      capture_pageview: false, // we send $pageview manually on route change
      capture_pageleave: true,
      defaults: '2025-05-24',
    })

    const router = useRouter()
    router.afterEach((to) => {
      // Wait a tick so document.title reflects the new page.
      nextTick(() => {
        posthog.capture('$pageview', { path: to.fullPath })
      })
    })

    return {
      provide: { posthog },
    }
  },
})
