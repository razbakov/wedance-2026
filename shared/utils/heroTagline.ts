/**
 * The line under an event's title (RAZ-1008): the description's first sentence,
 * at most ~160 characters (cut on a word, with "…"), so the hero says what it is
 * without pushing the buttons down. The full text stays in About.
 */
// Lines that are notes about the listing, not about the night: the import notice events
// synced from wedance.vip open with ("ℹ️ Imported by WeDance from public sources…"),
// "Source: <url>" and bare links.
const NOT_ABOUT_THE_EVENT = /^(?:ℹ️|ℹ|imported by wedance\b|source:|https?:\/\/\S+$)/i

export function heroTagline(description: string | null | undefined, max = 160): string {
  const text = String(description ?? '')
    .split(/\n/)
    .map(l => l.trim())
    .filter(l => l && !NOT_ABOUT_THE_EVENT.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  // First sentence: up to the first . ! ? followed by a space and a capital / digit / quote.
  const m = text.match(/^(.+?[.!?])(?=\s+["“'(A-ZÀ-Ý0-9])/)
  const first = m ? m[1] : text
  if (first.length <= max) return first
  const cut = first.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '')}…`
}
