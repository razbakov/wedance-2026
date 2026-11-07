import { describe, it, expect, beforeAll } from 'vitest'
import { createHmac } from 'node:crypto'
import { encryptToken, decryptToken } from './tokenCrypto'
import { verifyWebhookSignature, parseSignedRequest } from './signatures'
import { webhookRows } from './webhookRows'
import { signConnectState, verifyConnectState, pickAccount } from './instagramConnection'
import { instagramLoginUrl, exchangeCode, assignedInstagramAccounts, publishImage, MetaError } from './graph'
import { metaConfig, instagramRedirectUri } from './config'
import { jpegUrl } from '../../trpc/routers/instagram'

beforeAll(() => { process.env.OAUTH_SIGNING_SECRET = 'test-signing-secret-at-least-32-characters' })

const config = metaConfig({ META_APP_SECRET: 'shh', META_APP_ID: '111', META_INSTAGRAM_CONFIG_ID: '222' })

/** A fake Graph API: routes "METHOD path" → JSON, and records the calls. */
function fakeGraph(routes: Record<string, any | any[]>) {
  const calls: { method: string; path: string; params: URLSearchParams; auth: string | null }[] = []
  const queues = Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]))
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const u = new URL(url)
    const method = init?.method ?? 'GET'
    const path = u.pathname.replace(/^\/v[\d.]+/, '')
    const params = method === 'GET' ? u.searchParams : new URLSearchParams(String(init?.body))
    calls.push({ method, path, params, auth: (init?.headers as any)?.authorization ?? null })
    const q = queues[`${method} ${path}`]
    const body = q?.length ? (q.length > 1 ? q.shift() : q[0]) : { error: { message: `no route ${method} ${path}` } }
    return new Response(JSON.stringify(body), { status: body?.error ? 400 : 200 })
  }) as typeof fetch
  return { fetchImpl, calls }
}

describe('token encryption', () => {
  it('round-trips and never stores the token in clear', () => {
    const enc = encryptToken('EAAB-secret-token')
    expect(enc).not.toContain('EAAB')
    expect(enc.startsWith('v1.')).toBe(true)
    expect(decryptToken(enc)).toBe('EAAB-secret-token')
    expect(encryptToken('x')).not.toBe(encryptToken('x'))
  })
  it('refuses a tampered token', () => {
    const [v, iv, tag, data] = encryptToken('hello').split('.')
    const bytes = Buffer.from(data!, 'base64url')
    bytes[0] = bytes[0]! ^ 0xff
    expect(() => decryptToken([v, iv, tag, bytes.toString('base64url')].join('.'))).toThrow()
  })
})

describe('Meta signatures', () => {
  it('checks X-Hub-Signature-256 on the raw body', () => {
    const body = '{"object":"instagram"}'
    const sig = `sha256=${createHmac('sha256', 'shh').update(body).digest('hex')}`
    expect(verifyWebhookSignature(body, sig, 'shh')).toBe(true)
    expect(verifyWebhookSignature(body + ' ', sig, 'shh')).toBe(false)
    expect(verifyWebhookSignature(body, sig, '')).toBe(false)
    expect(verifyWebhookSignature(body, null, 'shh')).toBe(false)
  })
  it('parses a signed_request and rejects a forged one', () => {
    const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '42', issued_at: 1 })).toString('base64url')
    const sig = createHmac('sha256', 'shh').update(payload).digest('base64url')
    expect(parseSignedRequest(`${sig}.${payload}`, 'shh')?.user_id).toBe('42')
    expect(parseSignedRequest(`${sig}.${payload}`, 'other')).toBeNull()
    expect(parseSignedRequest('garbage', 'shh')).toBeNull()
  })
})

describe('webhook rows', () => {
  it('flattens comments and messages per Instagram account', () => {
    const rows = webhookRows({
      object: 'instagram',
      entry: [
        { id: '178', time: 5, changes: [{ field: 'comments', value: { id: 'c1', text: 'See you there!' } }] },
        { id: '178', messaging: [{ sender: { id: 's' }, message: { text: 'hi' } }] },
      ],
    })
    expect(rows).toEqual([
      { igUserId: '178', field: 'comments', payload: { id: 'c1', text: 'See you there!', time: 5 } },
      { igUserId: '178', field: 'messages', payload: { sender: { id: 's' }, message: { text: 'hi' } } },
    ])
    expect(webhookRows({ object: 'page', entry: [] })).toEqual([])
  })
})

describe('connect state and account choice', () => {
  it('signs who started it, and expires', () => {
    const now = Date.now()
    const s = signConnectState({ profileId: 'p', dancerId: 'd', username: 'salsa_bar' }, now)
    expect(verifyConnectState(s, now)).toEqual({ profileId: 'p', dancerId: 'd', username: 'salsa_bar' })
    expect(verifyConnectState(s, now + 16 * 60_000)).toBeNull()
    expect(verifyConnectState(s.slice(0, -2) + 'xx', now)).toBeNull()
  })
  it('takes the only account, else the one matching the page’s Instagram link', () => {
    const a = { id: '1', username: 'salsa_bar', name: null, picture: null }
    const b = { id: '2', username: 'other', name: null, picture: null }
    const page = { username: 'salsabar', socials: [{ platform: 'Instagram', url: 'https://instagram.com/Salsa_Bar/' }], instagramAliases: [] }
    expect(pickAccount([b], page)).toBe(b)
    expect(pickAccount([b, a], page)).toBe(a)
    expect(pickAccount([b, { ...a, username: 'x' }], page)).toBeNull()
    expect(pickAccount([b, { ...a, username: 'old' }], { ...page, instagramAliases: ['old'] })?.id).toBe('1')
  })
})

describe('Graph flows', () => {
  it('builds the Unified login dialog with config_id and no scope', () => {
    const u = new URL(instagramLoginUrl(instagramRedirectUri('https://2026.wedance.vip/'), 'st', config))
    expect(u.origin + u.pathname).toBe('https://www.facebook.com/dialog/oauth')
    expect(u.searchParams.get('config_id')).toBe('222')
    expect(u.searchParams.get('client_id')).toBe('111')
    expect(u.searchParams.get('override_default_response_type')).toBe('true')
    expect(u.searchParams.get('redirect_uri')).toBe('https://2026.wedance.vip/api/meta/instagram/callback')
    expect(u.searchParams.has('scope')).toBe(false)
  })

  it('exchanges the code (system-user token: no expiry) and finds the account', async () => {
    const g = fakeGraph({
      'GET /oauth/access_token': { access_token: 'SUAT', token_type: 'bearer' },
      'GET /me/assigned_instagram_accounts': { data: [{ id: '178' }] },
      'GET /178': { username: 'Salsa_Bar', name: 'Salsa Bar', profile_picture_url: 'https://cdn/x.jpg' },
    })
    const t = await exchangeCode('CODE', 'https://x/cb', { config, fetchImpl: g.fetchImpl })
    expect(t).toEqual({ token: 'SUAT', expiresAt: null })
    expect(g.calls[0]!.params.get('client_secret')).toBe('shh')
    const accounts = await assignedInstagramAccounts('SUAT', { config, fetchImpl: g.fetchImpl })
    expect(accounts).toEqual([{ id: '178', username: 'salsa_bar', name: 'Salsa Bar', picture: 'https://cdn/x.jpg' }])
    expect(g.calls[1]!.auth).toBe('Bearer SUAT')
  })

  it('refuses to exchange without the app secret', async () => {
    await expect(exchangeCode('c', 'r', { config: metaConfig({}) })).rejects.toThrow(MetaError)
  })

  it('publishes a post: container, wait, publish, permalink', async () => {
    const g = fakeGraph({
      'POST /178/media': { id: 'C1' },
      'GET /C1': [{ status_code: 'IN_PROGRESS' }, { status_code: 'FINISHED' }],
      'POST /178/media_publish': { id: 'M1' },
      'GET /M1': { permalink: 'https://www.instagram.com/p/abc/' },
    })
    const r = await publishImage('SUAT', '178', { imageUrl: 'https://img.jpg', caption: 'Salsa night!' }, { config, fetchImpl: g.fetchImpl, sleep: async () => {} })
    expect(r).toEqual({ mediaId: 'M1', permalink: 'https://www.instagram.com/p/abc/' })
    const create = g.calls.find(c => c.path === '/178/media')!
    expect(create.params.get('caption')).toBe('Salsa night!')
    expect(create.params.has('media_type')).toBe(false)
  })

  it('publishes a story without a caption, and surfaces Meta’s own message', async () => {
    const g = fakeGraph({
      'POST /178/media': { error: { message: 'raw', error_user_msg: 'The aspect ratio is not supported.', code: 36003 } },
    })
    await expect(publishImage('SUAT', '178', { imageUrl: 'https://img.jpg', caption: 'x', story: true }, { config, fetchImpl: g.fetchImpl }))
      .rejects.toThrow('The aspect ratio is not supported.')
    expect(g.calls[0]!.params.get('media_type')).toBe('STORIES')
    expect(g.calls[0]!.params.has('caption')).toBe(false)
  })
})

describe('jpegUrl', () => {
  it('asks Cloudinary for a JPEG once, leaves other hosts alone', () => {
    const u = 'https://res.cloudinary.com/wd/image/upload/v1/flyers/a.png'
    expect(jpegUrl(u)).toBe('https://res.cloudinary.com/wd/image/upload/f_jpg,q_90/v1/flyers/a.png')
    expect(jpegUrl(jpegUrl(u))).toBe(jpegUrl(u))
    expect(jpegUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
  })
})
