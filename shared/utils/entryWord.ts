/**
 * What an organiser sells, in the words dancers use (RAZ-1029).
 *
 * A festival, weekender or congress sells passes. A party, class or anything
 * else sells tickets. The editor ("Add a ticket") and the sign-up ("Pick your
 * ticket") use the same word for the same event. The stored field stays
 * `passes` either way.
 */
export type EntryNoun = 'pass' | 'ticket'

const FESTIVAL_TYPES = ['festival', 'weekender', 'congress']

/**
 * True when this event is promoted as a festival (by its type, or by the saved flag).
 * Named apart from `server/utils/myPlanFeeds.ts` `isFestivalEvent`, which only reads the flag.
 */
export function countsAsFestival(o: { type?: string | null; isFestival?: boolean | null } = {}): boolean {
  if (o.isFestival) return true
  return FESTIVAL_TYPES.includes(String(o.type ?? '').trim().toLowerCase())
}

/** "pass" for a festival, "ticket" for a party or class. */
export function entryNoun(o: { type?: string | null; isFestival?: boolean | null } = {}): EntryNoun {
  return countsAsFestival(o) ? 'pass' : 'ticket'
}

/** The four forms a sentence needs: pass/Pass/passes/Passes, or ticket/Ticket/tickets/Tickets. */
export function entryWords(noun: EntryNoun) {
  const pass = noun === 'pass'
  return {
    one: pass ? 'pass' : 'ticket',
    One: pass ? 'Pass' : 'Ticket',
    many: pass ? 'passes' : 'tickets',
    Many: pass ? 'Passes' : 'Tickets',
  } as const
}
