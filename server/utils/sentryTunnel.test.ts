import { describe, expect, it } from 'vitest'
import { parseDsn, tunnelTarget } from './sentryTunnel'

const DSN = 'https://abc123@o1.ingest.us.sentry.io/456'
const enc = (s: string) => new TextEncoder().encode(s)
const envelope = (dsn: string) => enc(`${JSON.stringify({ dsn, event_id: 'x' })}\n{"type":"feedback"}\n{}\n`)

describe('sentry tunnel', () => {
  it('parses a DSN', () => {
    expect(parseDsn(DSN)).toEqual({ host: 'o1.ingest.us.sentry.io', projectId: '456', publicKey: 'abc123' })
    expect(parseDsn('')).toBeNull()
    expect(parseDsn('not a url')).toBeNull()
  })

  it('forwards envelopes for our DSN to its ingest', () => {
    expect(tunnelTarget(envelope(DSN), DSN)).toEqual({ url: 'https://o1.ingest.us.sentry.io/api/456/envelope/' })
  })

  it('keeps binary attachments after the header line intact for forwarding', () => {
    const bin = new Uint8Array([...envelope(DSN), 0xFF, 0xD8, 0x00, 0x0A, 0x10])
    expect(tunnelTarget(bin, DSN)).not.toBeNull()
  })

  it('refuses other projects, other keys and other hosts (no open relay)', () => {
    expect(tunnelTarget(envelope('https://abc123@o1.ingest.us.sentry.io/999'), DSN)).toBeNull()
    expect(tunnelTarget(envelope('https://other@o1.ingest.us.sentry.io/456'), DSN)).toBeNull()
    expect(tunnelTarget(envelope('https://abc123@evil.example.com/456'), DSN)).toBeNull()
  })

  it('refuses garbage and a missing allowed DSN', () => {
    expect(tunnelTarget(enc('nope\n'), DSN)).toBeNull()
    expect(tunnelTarget(envelope(DSN), '')).toBeNull()
  })
})
