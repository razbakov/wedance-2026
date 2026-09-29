/**
 * Smart Ticket Picks — suggest the best-value ticket based on selected workshops.
 *
 * Algorithm:
 * 1. Group selected workshops by day
 * 2. For each ticket, check if it covers the workshops:
 *    - If ticket.days is empty, it covers all days (Full Pass)
 *    - Otherwise, it must include all days the dancer selected
 * 3. Check workshop count limit if applicable
 * 4. Calculate value: price per workshop (excluding soldOut tickets)
 * 5. Rank by value, return the best option
 */

import type { TicketOption, Workshop } from '~/types/festival'

export interface SuggestedTicket {
  ticket: TicketOption
  reason: string
  valueScore: number
  workshopsItCovers: number
}

export function suggestSmartTicket(
  selectedWorkshops: Workshop[],
  availableTickets: TicketOption[]
): SuggestedTicket | null {
  if (!selectedWorkshops.length || !availableTickets.length) return null

  // Get unique days from selected workshops
  const selectedDays = [...new Set(selectedWorkshops.map(w => w.day))]
  const workshopCount = selectedWorkshops.length

  // Filter tickets that can cover the selected workshops
  const viableTickets = availableTickets.filter(ticket => {
    // Skip sold out
    if (ticket.soldOut) return false

    // If ticket has specific days, it must include all selected days
    if (ticket.days.length > 0) {
      return selectedDays.every(day => ticket.days.includes(day))
    }

    // Full pass (empty days array) covers everything
    return true
  })

  if (!viableTickets.length) return null

  // Calculate value scores for each viable ticket
  const scoredTickets = viableTickets.map(ticket => {
    // How many workshops does this ticket likely cover?
    let workshopsItCovers = workshopCount

    // If ticket has a workshopCount limit and it's less than what they selected
    if (ticket.workshopCount !== undefined && ticket.workshopCount < workshopCount) {
      workshopsItCovers = ticket.workshopCount
    }

    // Value score: price per workshop covered
    // Lower is better, so we'll invert it for ranking
    const pricePerWorkshop = ticket.price / (workshopsItCovers || 1)

    return {
      ticket,
      reason: generateReason(ticket, selectedDays, workshopsItCovers, workshopCount),
      valueScore: -pricePerWorkshop, // Negative so higher score = better value
      workshopsItCovers,
    }
  })

  // Sort by value score (best first)
  scoredTickets.sort((a, b) => b.valueScore - a.valueScore)

  return scoredTickets[0] || null
}

function generateReason(
  ticket: TicketOption,
  selectedDays: string[],
  workshopsItCovers: number,
  totalWorkshopsSelected: number
): string {
  if (ticket.days.length === 0) {
    return `Full pass covers all ${totalWorkshopsSelected} workshops at €${ticket.price} (€${(ticket.price / totalWorkshopsSelected).toFixed(2)}/workshop)`
  }

  if (workshopsItCovers < totalWorkshopsSelected) {
    return `Covers ${workshopsItCovers} of ${totalWorkshopsSelected} workshops at €${ticket.price} (€${(ticket.price / workshopsItCovers).toFixed(2)}/workshop)`
  }

  return `Covers ${selectedDays.join(' & ')} (${totalWorkshopsSelected} workshops) at €${ticket.price} (€${(ticket.price / totalWorkshopsSelected).toFixed(2)}/workshop)`
}

/**
 * Get the price per workshop for a ticket given selected workshops.
 * Useful for comparison and display.
 */
export function getPricePerWorkshop(
  ticket: TicketOption,
  workshopCount: number
): number {
  if (ticket.workshopCount !== undefined && ticket.workshopCount < workshopCount) {
    return ticket.price / ticket.workshopCount
  }
  return ticket.price / (workshopCount || 1)
}
