/**
 * Client error ring-buffer.
 *
 * Keeps the last N console.error / window error / unhandledrejection / Vue
 * errors in memory so the "Report a problem" widget can attach "what actually
 * broke" to the Linear issue — without any backend or Sentry required. Purely
 * in-memory (never persisted), capped, and truncated per entry so it can't grow
 * unbounded or leak large payloads.
 *
 * Runs first (00. prefix) so it captures errors thrown by later plugins too.
 */
const MAX_ENTRIES = 30
const MAX_LEN = 2000

const buffer: string[] = []

function push(kind: string, ...parts: unknown[]) {
  try {
    const msg = parts
      .map((p) => {
        if (p instanceof Error) return `${p.name}: ${p.message}${p.stack ? `\n${p.stack.split('\n').slice(0, 4).join('\n')}` : ''}`
        if (typeof p === 'string') return p
        try {
          return JSON.stringify(p)
        } catch {
          return String(p)
        }
      })
      .join(' ')
    const time = new Date().toISOString().slice(11, 23)
    buffer.push(`[${time}] ${kind}: ${msg}`.slice(0, MAX_LEN))
    if (buffer.length > MAX_ENTRIES) buffer.shift()
  } catch {
    // never let error-capture throw
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const originalError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    push('console.error', ...args)
    originalError(...args)
  }

  window.addEventListener('error', (e) => {
    push('window.error', e.message, e.filename ? `(${e.filename}:${e.lineno}:${e.colno})` : '')
  })
  window.addEventListener('unhandledrejection', (e) => {
    push('unhandledrejection', (e as PromiseRejectionEvent).reason)
  })

  nuxtApp.hook('vue:error', (err) => {
    push('vue:error', err)
  })

  return {
    provide: {
      // Snapshot copy so callers can't mutate the live buffer.
      errorBuffer: () => [...buffer],
    },
  }
})
