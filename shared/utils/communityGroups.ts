/**
 * Community group invite links (WhatsApp / Telegram / Facebook groups) — one key per
 * group, so the same group submitted twice (with or without www., a trailing slash,
 * a ?mode= query) is found as a duplicate. Mirrors the backfill in migration 0066.
 */
export const GROUP_PLATFORMS = ['whatsapp', 'telegram', 'facebook', 'instagram', 'other'] as const
export type GroupPlatform = typeof GROUP_PLATFORMS[number]

function parse(url: string): URL | null {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null
  } catch { return null }
}

const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, '')

/** The platform an invite link belongs to, from its host. */
export function platformOf(url: string): GroupPlatform | null {
  const u = parse(url)
  if (!u) return null
  const h = host(u)
  if (h === 'chat.whatsapp.com' || h === 'wa.me' || h === 'whatsapp.com') return 'whatsapp'
  if (h === 't.me' || h === 'telegram.me' || h === 'telegram.dog') return 'telegram'
  if (h === 'facebook.com' || h === 'm.facebook.com' || h === 'fb.com') return 'facebook'
  if (h === 'instagram.com') return 'instagram'
  return 'other'
}

/**
 * The normalised key: host + path, no scheme / www / query / trailing slash. WhatsApp
 * invite codes are case-sensitive, so only their host is lowercased.
 */
export function inviteKey(url: string): string | null {
  const u = parse(url)
  if (!u) return null
  const h = host(u)
  if (h === 'chat.whatsapp.com') {
    const code = u.pathname.replace(/^\/(invite\/)?/i, '').split('/')[0]
    return code ? `chat.whatsapp.com/${code}` : null
  }
  const path = u.pathname.replace(/\/+$/, '')
  return `${h === 'telegram.me' || h === 'telegram.dog' ? 't.me' : h}${path}`.toLowerCase()
}

/**
 * Why a submitted link can't be a group of that platform, or null when it can.
 * Invite links only: a WhatsApp group is chat.whatsapp.com/<code>, a Telegram one t.me/<name>.
 */
export function inviteUrlError(platform: GroupPlatform, url: string): string | null {
  const u = parse(url)
  if (!u) return 'Paste the full link, starting with https://'
  const p = platformOf(url)
  if (platform === 'whatsapp') {
    if (host(u) !== 'chat.whatsapp.com' || !inviteKey(url)?.split('/')[1]) return 'A WhatsApp group link looks like https://chat.whatsapp.com/…'
  } else if (platform === 'telegram') {
    if (p !== 'telegram' || u.pathname.replace(/\/+$/, '').length < 2) return 'A Telegram link looks like https://t.me/…'
  } else if (platform === 'facebook') {
    if (p !== 'facebook') return 'A Facebook group link looks like https://facebook.com/groups/…'
  } else if (platform === 'instagram') {
    if (p !== 'instagram') return 'An Instagram link looks like https://instagram.com/…'
  }
  return null
}

/** The public @name of a Telegram link (t.me/name), for the bot's chat id. Null for invite links (t.me/+…). */
export function telegramNameOf(url: string): string | null {
  const u = parse(url)
  if (!u || platformOf(url) !== 'telegram') return null
  const name = u.pathname.replace(/^\/(s\/)?/, '').split('/')[0] ?? ''
  return /^[a-z][a-z0-9_]{3,}$/i.test(name) ? `@${name}` : null
}
