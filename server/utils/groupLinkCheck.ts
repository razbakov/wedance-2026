import { inviteKey, platformOf } from '../../shared/utils/communityGroups'

/**
 * Is a community group's invite link still alive? (city channels, migration 0066)
 *
 * Only WhatsApp and Telegram invite pages are fetched, and only on their own hosts
 * (never an address someone typed): the public invite page tells.
 *   - chat.whatsapp.com/<code>: a live invite has the group's name in og:title; a reset
 *     or unknown code has an empty og:title.
 *   - t.me/<name> or t.me/+<code>: a live chat shows its title (tgme_page_title);
 *     a missing one doesn't.
 * Anything else — other platforms, network errors, an unexpected page — is 'unknown',
 * so nothing is hidden on a guess.
 */
export type LinkStatus = 'ok' | 'dead' | 'unknown'
export interface LinkResult { status: LinkStatus; title: string | null }

const decode = (s: string) => s.replace(/&#0?39;/g, '\'').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

export function readInvitePage(platform: 'whatsapp' | 'telegram', html: string): LinkResult {
  if (platform === 'whatsapp') {
    const m = /<meta property="og:title" content="([^"]*)"/.exec(html)
    // No og tags at all: not the page we know — don't guess.
    if (!m || !/og:description/.test(html)) return { status: 'unknown', title: null }
    const title = decode(m[1] ?? '')
    return title ? { status: 'ok', title } : { status: 'dead', title: null }
  }
  if (!/og:title/.test(html)) return { status: 'unknown', title: null }
  const t = /class="tgme_page_title"[^>]*>\s*(?:<span[^>]*>)?([^<]+)/.exec(html)
  return t ? { status: 'ok', title: decode(t[1] ?? '') } : { status: 'dead', title: null }
}

export async function checkInviteLink(url: string, fetchImpl: typeof fetch = fetch): Promise<LinkResult> {
  const platform = platformOf(url)
  const key = inviteKey(url)
  if (!key || (platform !== 'whatsapp' && platform !== 'telegram')) return { status: 'unknown', title: null }
  // Rebuilt from the key, so only these two hosts are ever fetched.
  const target = `https://${key}`
  if (!/^https:\/\/(chat\.whatsapp\.com|t\.me)\//.test(target)) return { status: 'unknown', title: null }
  try {
    const res = await fetchImpl(target, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; WeDanceLinkCheck/1.0)', 'accept-language': 'en' }, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (!res.ok) return { status: res.status === 404 ? 'dead' : 'unknown', title: null }
    return readInvitePage(platform, (await res.text()).slice(0, 200_000))
  } catch {
    return { status: 'unknown', title: null }
  }
}

/**
 * A batch where almost everything came back dead means the pages changed, not that
 * every group died: keep the old statuses.
 */
export function batchLooksBroken(results: LinkResult[]): boolean {
  const checked = results.filter(r => r.status !== 'unknown')
  return checked.length >= 5 && checked.filter(r => r.status === 'dead').length / checked.length > 0.8
}
