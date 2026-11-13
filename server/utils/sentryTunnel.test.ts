import { describe, expect, it } from 'vitest'
import { envelopeHeaderLine, tunnelTarget } from './sentryTunnel'

const DSN = 'https://abc123@o340470.ingest.us.sentry.io/4512289226424320'

describe('tunnelTarget', () => {
  it('forwards envelopes for our project to its ingest endpoint', () => {
    const header = JSON.stringify({ event_id: 'x', dsn: DSN, sent_at: '2026-11-13T00:00:00Z' })
    expect(tunnelTarget(header, DSN)).toEqual({ url: 'https://o340470.ingest.us.sentry.io/api/4512289226424320/envelope/' })
  })

  it('rejects another project, another host, or junk — no open proxy', () => {
    expect(tunnelTarget(JSON.stringify({ dsn: 'https://k@o340470.ingest.us.sentry.io/999' }), DSN)).toBeNull()
    expect(tunnelTarget(JSON.stringify({ dsn: 'https://k@evil.example/4512289226424320' }), DSN)).toBeNull()
    expect(tunnelTarget('{}', DSN)).toBeNull()
    expect(tunnelTarget('not json', DSN)).toBeNull()
    expect(tunnelTarget(JSON.stringify({ dsn: DSN }), '')).toBeNull()
  })
})

describe('envelopeHeaderLine', () => {
  it('reads up to the first newline', () => {
    const body = new TextEncoder().encode('{"dsn":"x"}\n{"type":"event"}\n{}')
    expect(envelopeHeaderLine(body)).toBe('{"dsn":"x"}')
  })
})
