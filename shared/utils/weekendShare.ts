/**
 * Share my weekend (#527) — pure helpers shared by the router, the /w/<code>
 * page and the story image. Unit-tested in weekendShare.test.ts.
 */

/** Unambiguous lowercase letters and digits (no 0/o, 1/l/i) — the code is read off a story. */
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const WEEKEND_CODE_LENGTH = 7
export const WEEKEND_CODE_RE = /^[a-z2-9]{7}$/
/** Most parties one share (and one story) holds. */
export const WEEKEND_MAX_EVENTS = 6
/** Sharing the same parties again within this many days returns the same link. */
export const WEEKEND_REUSE_DAYS = 6

export function newWeekendCode(random: (n: number) => number = n => Math.floor(Math.random() * n)): string {
  let s = ''
  for (let i = 0; i < WEEKEND_CODE_LENGTH; i++) s += CODE_ALPHABET[random(CODE_ALPHABET.length)]
  return s
}

/** "Alex Razbakov" → "Alex". Friends see first names only. */
export function firstName(name: string | null | undefined): string {
  return String(name ?? '').trim().split(/\s+/)[0]?.slice(0, 40) ?? ''
}

/** A guest's typed name, cleaned: trimmed, no control chars or markup brackets, max 40. Empty = invalid. */
export function cleanGuestName(name: string | null | undefined): string {
  return String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

/** Same set of parties, order ignored — decides whether a share is reused. */
export function sameEventSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every(x => s.has(x))
}

/** "Marta" · "Marta and Jo" · "Marta, Jo and 3 others" */
export function joinersLine(names: readonly string[], max = 2): string {
  const n = names.filter(Boolean)
  if (!n.length) return ''
  if (n.length === 1) return n[0]!
  if (n.length <= max) return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`
  const rest = n.length - max
  return `${n.slice(0, max).join(', ')} and ${rest} other${rest === 1 ? '' : 's'}`
}
