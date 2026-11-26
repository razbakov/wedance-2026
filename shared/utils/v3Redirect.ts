/**
 * Old wedance.vip (v3, Nuxt 2 + Firebase) links → their 2026 pages, so the domain
 * can move to 2026 without breaking shared links, search results or printed NFC
 * cards. Path shapes come from v3's `pages/` and its PostHog traffic (Nov 2026:
 * /events/<firestore id>, /<profile handle>, /explore/<City> were most of it).
 *
 * `planV3Redirect` is pure: it either knows the target (`to`), needs one database
 * lookup (`lookup`, done by server/middleware/v3-redirect.ts), or returns null
 * (not a v3 link — 2026 handles it). 301 = moved for good; 302 = parked on a
 * nearby page until 2026 has its own (about, dance styles…).
 */

import { FILE_EXT } from './handle'

export type V3Lookup =
  | { kind: 'event'; id: string; fallback: string | null }
  | { kind: 'profile'; key: string; fallback: string | null }
  | { kind: 'city'; key: string; fallback: string }
  | { kind: 'nfc'; card: string; fallback: string }

export type V3Plan =
  | { to: string; code: 301 | 302 }
  | { lookup: V3Lookup }

/** First path segments 2026 serves itself (pages, server routes, public files). Never treated as a v3 handle. */
export const KNOWN_SEGMENTS = new Set([
  // app/pages
  'about', 'admin', 'artists', 'auth', 'battle', 'book', 'booking-terms', 'business', 'charanga', 'cities', 'confirm', 'dance-card', 'docs',
  'elections', 'events', 'festivals', 'find-your-dance', 'for-events', 'for-organizers', 'for-sponsors', 'for-venues',
  'gigs', 'imprint', 'meet', 'my-plan', 'my-year', 'oauth', 'onboarding', 'open', 'organizers', 'press', 'privacy-policy',
  'settings', 'shortlist', 'sketches', 'terms', 'u', 'venues', 'w', 'whats-new',
  // server routes + framework
  'api', 'mcp', '_nuxt', '__nuxt', '__nuxt_error', '_vercel', '.well-known',
  // public/ folders
  'brand', 'people', 'updates',
  // routeRules redirects (nuxt.config.ts)
  'datenschutz', 'impressum', 'agb', 'styleguide', 'design', 'architecture',
])

/** v3 locale prefixes (nuxt-i18n `prefix_except_default`, English unprefixed). */
const LOCALES = new Set(['de', 'es', 'fr', 'it', 'pl', 'pt', 'ro', 'tr', 'ru', 'sr'])

/** A Firestore auto id: 20 letters and digits. */
export const isFirestoreId = (s: string) => /^[A-Za-z0-9]{20}$/.test(s)

/** v3 pages with a fixed 2026 counterpart. */
const FIXED: Record<string, { to: string; code: 301 | 302 }> = {
  '/explore': { to: '/cities', code: 301 },
  '/events': { to: '/cities', code: 301 },
  '/search': { to: '/cities', code: 301 },
  '/where-can-i-dance': { to: '/cities', code: 301 },
  '/organize': { to: '/for-organizers', code: 301 },
  '/promoter': { to: '/for-organizers', code: 301 },
  '/grow': { to: '/for-organizers', code: 301 },
  '/start': { to: '/for-organizers', code: 301 },
  '/manager': { to: '/business', code: 301 },
  '/support': { to: '/docs', code: 301 },
  '/platform': { to: '/docs', code: 301 },
  '/wedance-v4': { to: '/whats-new', code: 301 },
  '/privacy': { to: '/privacy-policy', code: 301 },
  '/signin': { to: '/', code: 301 },
  '/signin-email': { to: '/', code: 301 },
  '/nopassword': { to: '/', code: 301 },
  '/register': { to: '/', code: 301 },
  '/signout': { to: '/', code: 301 },
  '/ua': { to: '/', code: 301 },
  '/instagram': { to: '/', code: 301 },
  // 2026 has no page for these yet: park them, so a real page can take over later.
  '/coc': { to: '/', code: 302 },
  '/foundation': { to: '/', code: 302 },
  '/get-involved': { to: '/', code: 302 },
  '/partners': { to: '/', code: 302 },
}

/** v3 sections that map as a whole, whatever follows. */
const SECTIONS: [string, { to: string; code: 301 | 302 }][] = [
  ['dance', { to: '/find-your-dance', code: 302 }],
  ['blog', { to: '/whats-new', code: 301 }],
  ['news', { to: '/whats-new', code: 301 }],
  ['competition', { to: '/battle', code: 301 }],
  ['posts', { to: '/', code: 301 }],
  ['stories', { to: '/', code: 301 }],
  ['reviews', { to: '/', code: 301 }],
  ['lists', { to: '/', code: 301 }],
  ['chat', { to: '/', code: 301 }],
  ['find-partner', { to: '/', code: 301 }],
  ['gift-card', { to: '/', code: 301 }],
  ['demo', { to: '/', code: 301 }],
]

const ADMIN_2026 = new Set(['ai-usage', 'cities', 'claims', 'community-groups', 'festivals', 'giveaways', 'users', 'videos'])
const PROFILE_SUBPAGES = new Set(['edit', 'share', 'embed'])
const EVENT_SUBPAGES = new Set(['edit', 'copy', 'dashboard', 'share', 'import'])
const CITY_TABS = new Set(['parties', 'classes', 'groups', 'tips'])

function decode(s: string) {
  try { return decodeURIComponent(s) } catch { return s }
}

/** Where an old v3 path goes, or null when it isn't a v3 link. `path` has no query string. */
export function planV3Redirect(path: string): V3Plan | null {
  const parts = path.split('/').filter(Boolean).map(decode)
  if (!parts.length) return null
  const [first, second, third] = parts
  const head = first!.toLowerCase()

  if (LOCALES.has(head)) {
    const rest = `/${parts.slice(1).join('/')}`
    const inner = rest === '/' ? null : planV3Redirect(rest)
    return inner ?? { to: rest, code: 301 }
  }

  if (parts.length === 1 && FIXED[`/${head}`]) return FIXED[`/${head}`]!
  const section = SECTIONS.find(([s]) => s === head)
  if (section) return section[1]

  if (head === 'explore') {
    if (!second || second === 'global' || second === 'undefined') return { to: '/cities', code: 301 }
    if (parts.length > 3 || (third && !CITY_TABS.has(third))) return { to: '/cities', code: 301 }
    return { lookup: { kind: 'city', key: second, fallback: '/cities' } }
  }

  if (head === 'events') {
    if (second === '-' && third === 'import') return { to: '/business/events/new', code: 301 }
    if (!second || !isFirestoreId(second)) return null
    if (parts.length > 3 || (third && !EVENT_SUBPAGES.has(third))) return null
    return { lookup: { kind: 'event', id: second, fallback: third ? '/cities' : null } }
  }

  if (head === 'rsvp' && second && isFirestoreId(second) && parts.length === 2) {
    return { lookup: { kind: 'event', id: second, fallback: '/cities' } }
  }

  if (head === 'nfc') {
    if (!second) return { to: '/', code: 301 }
    return { lookup: { kind: 'nfc', card: second, fallback: '/' } }
  }

  if (head === 'settings' && second === 'calendars') return { to: '/settings', code: 301 }
  if (head === 'admin' && second && !ADMIN_2026.has(second)) return { to: '/admin', code: 301 }

  // /<handle>, /<handle>/edit|share|embed — a v3 profile (dancer, page or city).
  if (KNOWN_SEGMENTS.has(head) || first!.startsWith('@') || first!.startsWith('_') || FILE_EXT.test(head)) return null
  if (parts.length > 2 || (second && !PROFILE_SUBPAGES.has(second))) return null
  return { lookup: { kind: 'profile', key: first!, fallback: second ? '/' : null } }
}
