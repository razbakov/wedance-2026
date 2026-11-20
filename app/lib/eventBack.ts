/**
 * Where the back link on an event or festival page goes (RAZ-1020).
 *
 * The dancer returns to the in-app page they opened the event from (My plan,
 * a city, a profile). Tab changes live in `?tab=` on this same page, so a
 * previous entry that is still this event is not a place to go back to.
 * Opened directly — nothing in-app behind it — the link goes to the event's
 * city, or the city list when the event has none.
 */

export type EventCity = { slug: string; name: string }

export type EventBack = {
  href: string
  label: string
  /** History steps to undo. 0 = follow `href` (nothing in-app to return to, or the distance isn't trustworthy). */
  delta: number
}

/** Where this visit to the event began, so later tab entries can be skipped. */
export type EventBackMemory = { path: string; origin: string; position: number }

const MAX_DELTA = 8
const SAFE_SLUG = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u

const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/my-plan': 'My plan',
  '/my-year': 'My year',
  '/meet': 'Meet',
  '/festivals': 'Festivals',
  '/cities': 'Cities',
  '/artists': 'Artists',
  '/find-your-dance': 'Find your dance',
}

export function eventBackTarget(
  input: {
    historyBack?: string | null
    position?: number | null
    eventPath: string
    city?: EventCity | null
  },
  memory: EventBackMemory | null = null,
): { back: EventBack; memory: EventBackMemory | null } {
  const eventPath = pathname(input.eventPath)
  const historyBack = internalPath(input.historyBack)
  const position = typeof input.position === 'number' && Number.isFinite(input.position) ? input.position : null
  const outside = historyBack && !sameEvent(historyBack, eventPath) ? historyBack : null
  const kept = memory && sameEvent(memory.path, eventPath) ? memory : null

  if (outside) {
    const next: EventBackMemory = { path: eventPath, origin: outside, position: position != null && position > 0 ? position : 0 }
    return { back: to(outside, input.city, 1), memory: next }
  }

  // First entry, or a reload with no in-app page behind this one.
  if (!historyBack) return { back: cityBack(input.city), memory: null }

  // The previous entry is still this event (a tab, a hash, another query).
  if (kept) {
    const enteredAt = kept.position
    if (position != null && enteredAt > 0 && position >= enteredAt) {
      const delta = position - enteredAt + 1
      if (delta >= 1 && delta <= MAX_DELTA) return { back: to(kept.origin, input.city, delta), memory: kept }
    }
    return { back: to(kept.origin, input.city, 0), memory: kept }
  }

  return { back: cityBack(input.city), memory: null }
}

function to(href: string, city: EventCity | null | undefined, delta: number): EventBack {
  return { href, label: labelFor(href, city), delta }
}

function cityBack(city?: EventCity | null): EventBack {
  const slug = city?.slug?.trim() ?? ''
  if (slug && SAFE_SLUG.test(slug)) return { href: `/cities/${slug}`, label: cityLabel(city!), delta: 0 }
  return { href: '/cities', label: 'Cities', delta: 0 }
}

function cityLabel(city: EventCity): string {
  const name = city.name.trim()
  if (!name || name === city.slug) return titleFromSlug(city.slug)
  return name
}

function labelFor(href: string, city?: EventCity | null): string {
  const path = pathname(href)
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  const citySlug = path.match(/^\/cities\/([^/]+)/)?.[1]
  if (citySlug) {
    const slug = safeDecode(citySlug)
    if (city && city.slug === slug && city.name.trim() && city.name.trim() !== city.slug) return city.name.trim()
    return titleFromSlug(slug)
  }
  const handle = path.match(/^\/@([^/]+)/)?.[1]
  if (handle) return `@${safeDecode(handle)}`
  return 'Back'
}

function titleFromSlug(slug: string): string {
  const words = slug.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1))
  return words.join(' ') || 'Back'
}

function sameEvent(url: string, eventPath: string): boolean {
  return pathname(url) === pathname(eventPath)
}

function pathname(url: string): string {
  const path = url.split(/[?#]/)[0] || '/'
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

/** An in-app path vue-router stored as `history.state.back`. Never a host or scheme. */
function internalPath(raw?: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (raw.includes('://') || /[\s\\]/.test(raw)) return null
  return raw
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}
