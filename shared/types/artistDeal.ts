/**
 * What an organizer offers an artist in the line-up, and the artist's terms in
 * their answer. Stored on the artist's invite (profile_invites.request.offer and
 * .terms, the same columns a venue ask uses), so no table of its own.
 */

/** Offers the organizer can start from in the Confirm popup. */
export const ARTIST_OFFERS = ['€80 per class', 'Travel + hotel', 'Free pass'] as const

/** The artist's terms, in their words ("€120 per class", "train from Vienna, a room for 2 nights"). */
export type ArtistTerms = {
  fee?: string
  needs?: string
}

/** "Fee €120 per class · Needs: train from Vienna" — empty when they set nothing. */
export function artistTermsText(t: ArtistTerms | null | undefined): string {
  if (!t) return ''
  return [t.fee && `Fee ${t.fee}`, t.needs && `Needs: ${t.needs}`].filter(Boolean).join(' · ')
}
