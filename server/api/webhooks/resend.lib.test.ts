import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyResendSignature } from './resend.lib'

const raw = Buffer.from('test-secret-bytes-0123456789')
const secret = `whsec_${raw.toString('base64')}`
const body = '{"type":"email.delivered","data":{"email_id":"abc"}}'
const now = 1_790_000_000_000
const timestamp = String(Math.floor(now / 1000))
const sign = (id: string, ts: string, b: string) => `v1,${createHmac('sha256', raw).update(`${id}.${ts}.${b}`).digest('base64')}`

describe('verifyResendSignature', () => {
  it('accepts a correct signature, also among several', () => {
    expect(verifyResendSignature({ secret, id: 'msg_1', timestamp, signature: sign('msg_1', timestamp, body), body, now })).toBe(true)
    expect(verifyResendSignature({ secret, id: 'msg_1', timestamp, signature: `v1,AAAA ${sign('msg_1', timestamp, body)}`, body, now })).toBe(true)
  })

  it('refuses a changed body, a wrong secret, or missing headers', () => {
    const signature = sign('msg_1', timestamp, body)
    expect(verifyResendSignature({ secret, id: 'msg_1', timestamp, signature, body: `${body} `, now })).toBe(false)
    expect(verifyResendSignature({ secret: `whsec_${Buffer.from('other').toString('base64')}`, id: 'msg_1', timestamp, signature, body, now })).toBe(false)
    expect(verifyResendSignature({ secret, id: undefined, timestamp, signature, body, now })).toBe(false)
    expect(verifyResendSignature({ secret: '', id: 'msg_1', timestamp, signature, body, now })).toBe(false)
  })

  it('refuses an old timestamp (replay)', () => {
    const old = String(Math.floor(now / 1000) - 600)
    expect(verifyResendSignature({ secret, id: 'msg_1', timestamp: old, signature: sign('msg_1', old, body), body, now })).toBe(false)
  })
})
