// The one line under "Your festivals" in My plan (RAZ-990). It replaced the
// "Festivals this year" stats card and the "Your year at a glance" month strip,
// so it carries what the stats card showed when it had something to say: money
// already paid, money still to pay, and early-bird deadlines ending this week.

export interface FestivalYearTotals {
  count: number
  /** Ticket "from" prices of festivals already bought, in euros. */
  committed: number
  /** Ticket "from" prices of festivals not bought yet, in euros. */
  pending: number
  /** Early-bird deadlines within 7 days on festivals not bought yet. */
  urgentDeadlines: number
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function festivalYearLine({ count, committed, pending, urgentDeadlines }: FestivalYearTotals): string {
  return [
    plural(count, 'festival'),
    committed > 0 ? `€${committed} committed` : '',
    pending > 0 ? `€${pending} still owed` : '',
    urgentDeadlines > 0 ? `${plural(urgentDeadlines, 'early-bird')} ending this week` : '',
  ].filter(Boolean).join(' · ')
}
