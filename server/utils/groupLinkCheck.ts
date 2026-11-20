import { inviteKey, platformOf } from '../../shared/utils/communityGroups'

/**
 * Is a community group's invite link still alive? (city channels, migration 0067)
 *
 * Only WhatsApp and Telegram invite pages are fetched, and only on their own hosts
 * (never an address someone typed): the public invite page tells.
 *   - chat.whatsapp.com/<code>: a live invite has the group's name in og:title and a link
 *     type in invite_link_type_v2 (REGULAR / SUB / PARENT); a reset or unknown code has
 *     BOTH empty. Only both empty is 'dead' — one empty and one filled is 'unknown', so a
 *     working group is never hidden on one ambiguous signal. Checked against real pages
 *     (RAZ-862, Nov 2026): 5 working invites (plain groups, community sub-groups, a
 *     community parent) all came back 'ok'; 2 made-up codes came back 'dead'.
 *   - t.me/<name> or t.me/+<code>: a live chat shows its title (tgme_page_title);
 *     a missing one doesn't.
 * Anything else — other platforms, network errors, an unexpected page — is 'unknown',
 * so nothing is hidden on a guess.
 */
export type LinkStatus = 'ok' | 'dead' | 'unknown'
export interface LinkResult { status: LinkStatus; title: string | null }

const fromCode = (n: number) => (Number.isFinite(n) && n > 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : '')
// WhatsApp writes accents as hex entities ("G&#xe9;n&#xe9;ral"), Telegram as decimal.
const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCode(Number.parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => fromCode(Number(d)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .trim()

export function readInvitePage(platform: 'whatsapp' | 'telegram', html: string): LinkResult {
  if (platform === 'whatsapp') {
    const m = /<meta property="og:title" content="([^"]*)"/.exec(html)
    // No og tags at all: not the page we know — don't guess.
    if (!m || !/og:description/.test(html)) return { status: 'unknown', title: null }
    const title = decode(m[1] ?? '')
    if (title) return { status: 'ok', title }
    // Empty title: dead only if the link type is present and empty too. A missing tag
    // means the page changed; a filled one means the group exists — neither is proof.
    const type = /<meta property="invite_link_type_v2" content="([^"]*)"/.exec(html)
    return type && !type[1]?.trim() ? { status: 'dead', title: null } : { status: 'unknown', title: null }
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
