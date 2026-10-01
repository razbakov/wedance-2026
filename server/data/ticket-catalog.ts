/**
 * Server-side ticket catalog — the trusted source for ticket prices.
 *
 * Until ticket pricing is stored in the database, this static catalog is
 * the authoritative record. The client-side mock data in `app/data/mock-*.ts`
 * defines what the user sees; this file defines what Stripe charges.
 * Prices MUST match — a mismatch is a bug.
 */

export interface TicketDef {
  name: string
  /** Price in euro cents (e.g. 2500 = €25.00) */
  priceInCents: number
  description: string
}

/**
 * Map of festivalSlug → array of available tickets.
 * Extend when new festivals are added.
 */
export const ticketCatalog: Record<string, TicketDef[]> = {
  'salsa-open-berlin-2026': [],
  'meneate-viena-2026': [
    { name: 'Full Pass', priceInCents: 21000, description: 'All workshops + all parties (excl. Maykel Blanco concert)' },
    { name: 'Friday Pass', priceInCents: 6000, description: 'Workshops + Welcome Party at wolke19' },
    { name: 'Saturday Pass', priceInCents: 12000, description: 'Workshops + Timba Gala Party at wolke19' },
    { name: 'Sunday Pass', priceInCents: 8400, description: 'Workshops at wolke19 + Goodbye Party at Fanialive' },
    { name: 'Party Pass', priceInCents: 9600, description: 'Maykel Blanco concert + all parties' },
  ],
  'cuban-fire-munich-2026': [
    { name: 'Full Pass 5H + Party', priceInCents: 10000, description: 'All 5 workshops + Saturday Timba Party' },
    { name: 'Full Pass 4H + Party', priceInCents: 8500, description: '4 workshops + Saturday Timba Party' },
    { name: '3 Workshops', priceInCents: 6500, description: 'Any 3 workshops' },
    { name: '2 Workshops', priceInCents: 4500, description: 'Any 2 workshops' },
    { name: '1 Workshop', priceInCents: 2500, description: 'Any single workshop' },
    { name: 'Party Only', priceInCents: 1000, description: 'Saturday Timba Party' },
  ],
  'caribbean-urban-fire-munich-2026': [
    { name: 'Full Pass (3 Workshops)', priceInCents: 6000, description: 'All 3 workshops' },
    { name: '2 Workshops', priceInCents: 4500, description: 'Any 2 workshops' },
    { name: '1 Workshop', priceInCents: 2500, description: 'Any single workshop' },
  ],
  'agua-pichi-2027': [
    { name: 'Full Pass', priceInCents: 17000, description: 'All workshops + all parties incl. Los Van Van' },
    { name: 'Super-Early-Bird Party Pass', priceInCents: 5000, description: 'Party access + Los Van Van concert' },
    { name: 'Party Pass', priceInCents: 9000, description: 'All parties incl. Los Van Van concert' },
    { name: 'Saturday Pass', priceInCents: 8000, description: 'Saturday workshops + Los Van Van concert' },
    { name: 'Thursday Roots Pass', priceInCents: 4500, description: 'Thursday workshops + La Rumba de Pedro Pablo concert' },
  ],
}

/**
 * Look up a ticket by slug + name. Returns the definition or null.
 */
export function findTicket(festivalSlug: string, ticketName: string): TicketDef | null {
  const tickets = ticketCatalog[festivalSlug]
  if (!tickets) return null
  return tickets.find(t => t.name === ticketName) ?? null
}
