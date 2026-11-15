/**
 * "Meet new friends" on My plan (RAZ-981): can other dancers see you in their
 * deck, and what is missing if not.
 *
 * Mirrors the deck query in `server/utils/myPlanFeeds.ts` (`discoverDeck`):
 * a dancer enters other people's decks only with a public profile AND a photo.
 * Locals are matched on city. Festival-goers are matched on a festival they
 * share they're going to ("Show me" in the festival's "Shall we dance?").
 */

export type MeetVisibilityInput = {
  profilePublic: boolean | null | undefined
  photo: string | null | undefined
  city: string | null | undefined
}

export type MeetVisibility = {
  /** True when other dancers' decks can show this dancer at all. */
  shown: boolean
  /** What to fix in Settings, in that order. `city` only narrows who finds you. */
  missing: Array<'photo' | 'public' | 'city'>
  /** One sentence for the dancer, in the second person. */
  text: string
}

export function meetVisibility(input: MeetVisibilityInput): MeetVisibility {
  const missing: MeetVisibility['missing'] = []
  if (!input.photo?.trim()) missing.push('photo')
  // `profilePublic` defaults to on (null/undefined = public), like the settings form.
  if (input.profilePublic === false) missing.push('public')
  const city = input.city?.trim()

  if (missing.length) {
    const fixes = missing.map(m => (m === 'photo' ? 'add a photo' : 'turn on Public profile'))
    return {
      shown: false,
      missing,
      text: `Other dancers can't see you here yet: ${fixes.join(' and ')} in Settings.`,
    }
  }
  if (!city) {
    return {
      shown: true,
      missing: ['city'],
      text: 'Other dancers can see you here, but not as a local: add your city in Settings.',
    }
  }
  return { shown: true, missing, text: `Dancers in ${city} see you in their deck too.` }
}
