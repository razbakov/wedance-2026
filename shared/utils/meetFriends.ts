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
  /** What to do, in that order: photo / public on /dance-card, or go out (`night`). */
  missing: Array<'photo' | 'public' | 'night'>
  /** One sentence for the dancer, in the second person. */
  text: string
}

export function meetVisibility(input: MeetVisibilityInput): MeetVisibility {
  const missing: MeetVisibility['missing'] = []
  if (!input.photo?.trim()) missing.push('photo')
  // `profilePublic` defaults to on (null/undefined = public), like the settings form.
  if (input.profilePublic === false) missing.push('public')
  if (missing.includes('photo')) return { shown: false, missing, text: 'Add a photo so other dancers can see you here.' }
  if (missing.length) return { shown: false, missing, text: 'Your profile is private, so other dancers can’t see you here.' }

  const night = input.nextNight
  if (night) return { shown: true, missing, text: `You’re visible — others can see you’re going to ${night.eventName}.` }
  if (input.festivalsShown) return { shown: true, missing: ['night'], text: 'Festival friends can see you. Go to a night out and dancers near you will too.' }
  return { shown: false, missing: ['night'], text: 'Others can’t see you yet. Go to a night out and you’ll show up here.' }
}
