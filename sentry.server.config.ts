import * as Sentry from '@sentry/nuxt'

// DSN-gated (see sentry.client.config.ts). Server errors — tRPC mutations, API
// routes, SSR — report here when SENTRY_DSN is set; otherwise a no-op.
const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    release: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || undefined,
  })
}
