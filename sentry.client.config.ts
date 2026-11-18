import * as Sentry from '@sentry/nuxt'

// DSN-gated: with no SENTRY_DSN (surfaced via public runtime config) the SDK is
// never initialised and stays a complete no-op — safe to ship un-keyed.
const dsn = useRuntimeConfig().public.sentryDsn

if (dsn) {
  Sentry.init({
    dsn,
    // Send envelopes through our own domain (server/api/m.post.ts): privacy
    // blockers drop *.ingest.sentry.io, and with it "Report a problem" (RAZ-976).
    tunnel: '/api/m',
    // Session Replay: sample a slice of all sessions, but always keep the
    // recording when an error occurs so problem reports can link to it.
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: 0.2,
    release: useRuntimeConfig().public.commitSha || undefined,
  })

  // Expose the SDK so the "Report a problem" widget (useReportContext) can read
  // the current replay id + last event id without importing Sentry itself.
  ;(window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry
}
