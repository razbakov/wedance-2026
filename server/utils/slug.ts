/**
 * Username / slug generation for public profile URLs (/u/<username>).
 *
 * A username is a slug of the dancer's name plus a short random suffix, so it's
 * human-readable and effectively collision-free without a lookup. The unique
 * constraint on dancers.username is the real guard; the random suffix just makes
 * a clash astronomically unlikely (register/onboarding don't retry on the ~1e-6
 * chance — an insert would surface a 23505 that the caller can handle).
 */

export function slugify(name: string): string {
  // NFKD splits accented letters into base + combining mark; we must strip the
  // combining marks (U+0300–U+036F) BEFORE collapsing other punctuation to
  // dashes, otherwise "Alösha" → "alo-sha" (the mark becomes a dash) instead of
  // "alosha". Order matters here.
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return base || 'dancer'
}

export function randomSuffix(len = 5): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, len)
}

export function generateUsername(name: string): string {
  return `${slugify(name)}-${randomSuffix()}`
}
