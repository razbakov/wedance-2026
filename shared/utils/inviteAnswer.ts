/**
 * What an answer to an artist invite or a venue ask says in writing: the
 * subject and lines of the email to whoever answered (their copy, with the
 * "That's me" link) and of the email to the organiser who asked.
 */
export type InviteAnswerFacts = {
  kind: 'artist' | 'venue'
  status: 'confirmed' | 'declined' | 'proposed'
  /** The artist's or venue's name. */
  profileName: string
  eventName: string
  /** "Saturday 6 December · 20:00" */
  when: string
  place: string
  /** What the organiser offered. */
  offer: string
  /** Their terms, already as text ("Fee €120 per class · Needs: …"). */
  terms: string
  /** A venue's other date. */
  alternative: string
  /** An artist's "the programme isn't right: …". */
  programmeNote: string
  message: string
  /** The name the flyer uses for an artist, when it differs from the page. */
  flyerName: string
}

const STATUS: Record<InviteAnswerFacts['kind'], Record<InviteAnswerFacts['status'], { you: string; them: string }>> = {
  artist: {
    confirmed: { you: 'You’re in', them: 'is in' },
    declined: { you: 'You can’t make it to', them: 'can’t make it to' },
    proposed: { you: 'You answered', them: 'answered' },
  },
  venue: {
    confirmed: { you: 'You can host', them: 'can host' },
    proposed: { you: 'You suggested another date for', them: 'suggests another date for' },
    declined: { you: 'You can’t host', them: 'can’t host' },
  },
}

export function answerSubjects(f: InviteAnswerFacts) {
  const s = STATUS[f.kind][f.status]
  const tail = f.kind === 'artist' && f.status === 'confirmed' ? ` for ${f.eventName}` : ` ${f.eventName}`
  return {
    // The answerer's copy: "You’re in for Misterio en Blanco"
    you: `${s.you}${tail}`,
    // The organiser's: "Milaila Capote is in for Misterio en Blanco"
    them: `${f.profileName} ${s.them}${tail}`,
  }
}

/** The answer in a few lines, the same for both emails. */
export function answerLines(f: InviteAnswerFacts): string[] {
  const out: string[] = []
  if (f.when) out.push(`🗓 ${f.when}`)
  if (f.place) out.push(`📍 ${f.place}`)
  if (f.status === 'declined') {
    if (f.message) out.push(`💬 ${f.message}`)
    return out
  }
  if (f.alternative) out.push(`↪ Another date: ${f.alternative}`)
  if (f.offer) out.push(`💶 Offered: ${f.offer}`)
  if (f.terms) out.push(`🤝 ${f.kind === 'venue' ? 'Their terms' : 'Terms'}: ${f.terms}`)
  if (f.flyerName && f.flyerName !== f.profileName) out.push(`🪧 On the flyer as: ${f.flyerName}`)
  if (f.programmeNote) out.push(`✏️ Programme: ${f.programmeNote}`)
  if (f.message) out.push(`💬 ${f.message}`)
  return out
}
