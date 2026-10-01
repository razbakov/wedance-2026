/**
 * Server-side ticket price registry.
 *
 * Prices are authoritative here — the client sends only the ticket name,
 * never the amount.  This prevents price-tampering (a malicious client
 * sending €1 for a €210 pass).
 *
 * When tickets move to a database table this file goes away; the server
 * will read prices from the DB instead.
 *
 * Prices are in **euro cents** (Stripe's unit_amount).
 */

interface TicketEntry {
  name: string
  priceCents: number
  soldOut?: boolean
}

const registry: Record<string, TicketEntry[]> = {
  'meneate-viena-2026': [
    { name: 'Full Pass', priceCents: 21_000, soldOut: true },
    { name: 'Friday Pass', priceCents: 6_000 },
    { name: 'Saturday Pass', priceCents: 12_000 },
    { name: 'Sunday Pass', priceCents: 8_400 },
    { name: 'Party Pass', priceCents: 9_600 },
  ],
  'cuban-fire-munich-2026': [
    { name: 'Full Pass 5H + Party', priceCents: 10_000 },
    { name: 'Full Pass 4H + Party', priceCents: 8_500 },
    { name: '3 Workshops', priceCents: 6_500 },
    { name: '2 Workshops', priceCents: 4_500 },
    { name: '1 Workshop', priceCents: 2_500 },
    { name: 'Party Only', priceCents: 1_000 },
  ],
  'caribbean-urban-fire-munich-2026': [
    { name: 'Full Pass (3 Workshops)', priceCents: 6_000 },
    { name: '2 Workshops', priceCents: 4_500 },
    { name: '1 Workshop', priceCents: 2_500 },
  ],
  'agua-pichi-2027': [
    { name: 'Full Pass', priceCents: 17_000 },
    { name: 'Super-Early-Bird Party Pass', priceCents: 5_000, soldOut: true },
    { name: 'Party Pass', priceCents: 9_000 },
    { name: 'Saturday Pass', priceCents: 8_000 },
    { name: 'Thursday Roots Pass', priceCents: 4_500 },
  ],
}

/**
 * Look up a ticket's price in cents.  Returns `null` when the festival
 * or ticket name is not in the registry (the caller should 404).
 */
export function getTicketPriceCents(
  festivalSlug: string,
  ticketName: string,
): { priceCents: number; soldOut: boolean } | null {
  const tickets = registry[festivalSlug]
  if (!tickets) return null
  const match = tickets.find((t) => t.name === ticketName)
  if (!match) return null
  return { priceCents: match.priceCents, soldOut: !!match.soldOut }
}
