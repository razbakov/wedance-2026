import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        // WeDance flame mark, tinted V3 red (#dc2626 — same red as
        // "night" in the homepage H1). Modern browsers use the SVG;
        // older browsers + Windows fall back to the multi-size .ico;
        // iOS home-screen uses the 180x180 PNG.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48 64x64' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  nitro: {
    preset: 'vercel',
  },
  modules: ['shadcn-nuxt', '@sentry/nuxt/module'],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  css: ['./app/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'WeDance <noreply@wedance.vip>',
    siteUrl: process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    tickettailorWebhookSecret: process.env.TICKETTAILOR_WEBHOOK_SECRET || '',
    public: {
      // PostHog product analytics. Empty key => tracking is a no-op (safe to
      // ship un-keyed). Set NUXT_PUBLIC_POSTHOG_KEY (phc_…) to turn it on.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      // Sentry error monitoring + session replay. Empty DSN => the SDK is a
      // no-op (safe to ship un-keyed, same pattern as PostHog). Set SENTRY_DSN
      // to turn it on; problem reports then link to the user's replay.
      sentryDsn: process.env.SENTRY_DSN || '',
      // Base URL of the Sentry replays view, e.g.
      // https://<org>.sentry.io/organizations/<org>/replays — the report widget
      // appends the replay id to deep-link triage straight to the recording.
      sentryReplayUrlBase: process.env.SENTRY_REPLAY_URL_BASE || '',
      // Short commit SHA, surfaced in problem reports as the build identifier.
      commitSha: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
    },
  },
  // Source-map upload for readable Sentry stack traces. Skipped automatically
  // (build still succeeds) when SENTRY_AUTH_TOKEN is absent.
  sentry: {
    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
  },
})
