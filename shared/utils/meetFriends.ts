/**
 * "Meet new friends" (RAZ-981): can other dancers see you in their deck, and
 * what to do if not.
 *
 * Mirrors the deck query in `server/utils/myPlanFeeds.ts` (`discoverDeck`):
 * a dancer is in other people's decks only while they are going somewhere —
 * signed up to a night out in the next two weeks (shown to everyone going out
 * in that city), or going to a festival they chose "Show me" for — and only
 * with a public profile AND a photo.
 */

export type MeetVisibilityInput = {
  profilePublic: boolean | null | undefined
  photo: string | null | undefined
  /** Their next night out (from `plan.discover` → `me.nextNight`). */
  nextNight?: { eventName: string; city: string } | null
  /** Festivals they chose "Show me" for. */
  festivalsShown?: number
}

export type MeetVisibility = {
  /** True when other dancers' decks show this dancer right now. */
  shown: boolean
  /** What to do, in that order: photo / public in Settings, or go out (`night`). */
  missing: Array<'photo' | 'public' | 'night'>
  /** One sentence for the dancer, in the second person. */
  text: string
}

export function meetVisibility(input: MeetVisibilityInput): MeetVisibility {
  const missing: MeetVisibility['missing'] = []
  if (!input.photo?.trim()) missing.push('photo')
  // `profilePublic` defaults to on (null/undefined = public), like the settings form.
  if (input.profilePublic === false) missing.push('public')
  if (missing.length) {
    const fixes = missing.map(m => (m === 'photo' ? 'add a photo' : 'turn on Public profile'))
    return { shown: false, missing, text: `Other dancers can't see you here yet: ${fixes.join(' and ')} in Settings.` }
  }

  const night = input.nextNight
  const fests = input.festivalsShown ?? 0
  const festLine = fests ? ` Dancers going to your ${fests === 1 ? 'festival' : `${fests} festivals`} see you too.` : ''
  if (night) {
    const where = night.city ? ` in ${night.city}` : ''
    return { shown: true, missing, text: `Dancers going out${where} see you're going to ${night.eventName}.${festLine}` }
  }
  if (fests) {
    return {
      shown: true,
      missing: ['night'],
      text: `Dancers going to your ${fests === 1 ? 'festival' : `${fests} festivals`} see you. Sign up to a night out and dancers here will too.`,
    }
  }
  return { shown: false, missing: ['night'], text: 'Nobody sees you here yet: sign up to a night out, and everyone going out that week sees you.' }
}
