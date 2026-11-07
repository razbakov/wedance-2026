import { metaConfig, type MetaConfig } from './config'

/**
 * Minimal Graph API client for Instagram with Unified login (#501).
 *
 * Everything goes to graph.facebook.com with the system-user token (never
 * graph.instagram.com, which rejects it). `/me` on that token is the system
 * user, not the person; the Instagram account is found through
 * /me/assigned_instagram_accounts (needs business_management in the login
 * configuration, else the list is empty and every IG call fails with 100/33).
 *
 * `fetchImpl` is injectable so the flows are unit-tested without the network.
 */
export class MetaError extends Error {
  constructor(message: string, public code?: number, public subcode?: number, public status?: number) {
    super(message)
    this.name = 'MetaError'
  }
}

type Fetch = typeof fetch
export interface GraphOpts { config?: MetaConfig; fetchImpl?: Fetch; sleep?: (ms: number) => Promise<void> }

function base(c: MetaConfig) { return `https://graph.facebook.com/${c.graphVersion}` }

async function call<T>(opts: GraphOpts, method: 'GET' | 'POST', path: string, params: Record<string, string | undefined>, token?: string): Promise<T> {
  const c = opts.config ?? metaConfig()
  const f = opts.fetchImpl ?? fetch
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v)
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  const url = `${base(c)}${path}`
  const res = method === 'GET'
    ? await f(`${url}?${qs}`, { headers })
    : await f(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' }, body: qs })
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) {
    const e = data?.error ?? {}
    throw new MetaError(e.error_user_msg || e.message || `Instagram said no (HTTP ${res.status}).`, e.code, e.error_subcode, res.status)
  }
  return data as T
}

/** The Facebook Login for Business dialog for our "Connect Instagram" configuration. */
export function instagramLoginUrl(redirectUri: string, state: string, config: MetaConfig = metaConfig()): string {
  const qs = new URLSearchParams({
    client_id: config.appId,
    config_id: config.instagramConfigId,
    redirect_uri: redirectUri,
    response_type: 'code',
    override_default_response_type: 'true',
    state,
  })
  // Same host and path as the login URL the dashboard generates.
  return `https://www.facebook.com/dialog/oauth?${qs}`
}

/** code → system-user token (never expires: no expires_in). */
export async function exchangeCode(code: string, redirectUri: string, opts: GraphOpts = {}) {
  const c = opts.config ?? metaConfig()
  if (!c.appSecret) throw new MetaError('Instagram isn’t set up on this server (META_APP_SECRET).')
  const r = await call<{ access_token: string; token_type?: string; expires_in?: number }>(opts, 'GET', '/oauth/access_token', {
    client_id: c.appId, client_secret: c.appSecret, redirect_uri: redirectUri, code,
  })
  if (!r.access_token) throw new MetaError('Instagram didn’t send a token back.')
  return { token: r.access_token, expiresAt: r.expires_in ? new Date(Date.now() + r.expires_in * 1000) : null }
}

export interface IgAccount { id: string; username: string; name: string | null; picture: string | null }

/** The Instagram accounts the person gave WeDance access to in the dialog. */
export async function assignedInstagramAccounts(token: string, opts: GraphOpts = {}): Promise<IgAccount[]> {
  const r = await call<{ data?: { id: string; username?: string; name?: string; profile_picture_url?: string }[] }>(
    opts, 'GET', '/me/assigned_instagram_accounts', { fields: 'id,username,name,profile_picture_url' }, token)
  const out: IgAccount[] = []
  for (const a of r.data ?? []) {
    if (!a?.id) continue
    let { username, name, profile_picture_url: picture } = a
    if (!username) {
      const p = await call<{ username?: string; name?: string; profile_picture_url?: string }>(opts, 'GET', `/${a.id}`, { fields: 'username,name,profile_picture_url' }, token)
      username = p.username; name = p.name; picture = p.profile_picture_url
    }
    if (username) out.push({ id: a.id, username: username.toLowerCase(), name: name ?? null, picture: picture ?? null })
  }
  return out
}

/**
 * Publish one image as a feed post (with caption) or a story (no caption).
 * Instagram wants a public JPEG: pass a Cloudinary `f_jpg` URL.
 */
export async function publishImage(token: string, igUserId: string, input: { imageUrl: string; caption?: string | null; story?: boolean }, opts: GraphOpts = {}) {
  const sleep = opts.sleep ?? ((ms: number) => new Promise(r => setTimeout(r, ms)))
  const container = await call<{ id: string }>(opts, 'POST', `/${igUserId}/media`, {
    image_url: input.imageUrl,
    ...(input.story ? { media_type: 'STORIES' } : { caption: input.caption ?? '' }),
  }, token)
  // Images are usually FINISHED at once; wait up to ~20 s before giving up.
  for (let i = 0; i < 10; i++) {
    const s = await call<{ status_code?: string; status?: string }>(opts, 'GET', `/${container.id}`, { fields: 'status_code,status' }, token)
    if (s.status_code === 'FINISHED' || s.status_code === 'PUBLISHED') break
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new MetaError(`Instagram couldn’t use the picture (${s.status || s.status_code}).`)
    if (i === 9) throw new MetaError('Instagram is still processing the picture. Try again in a minute.')
    await sleep(2000)
  }
  const pub = await call<{ id: string }>(opts, 'POST', `/${igUserId}/media_publish`, { creation_id: container.id }, token)
  const m = await call<{ permalink?: string }>(opts, 'GET', `/${pub.id}`, { fields: 'permalink' }, token).catch(() => ({} as { permalink?: string }))
  return { mediaId: pub.id, permalink: m.permalink ?? null }
}
