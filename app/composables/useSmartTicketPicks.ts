/**
 * useSmartTicketPicks — composable for smart ticket suggestions
 * Reactive wrapper around the smartTicketPicks utility.
 */

import { computed, type ComputedRef } from 'vue'
import { suggestSmartTicket, type SuggestedTicket } from '~/shared/utils/smartTicketPicks'
import type { TicketOption, Workshop } from '~/types/festival'

export interface UseSmartTicketPicksOptions {
  selectedWorkshops: ComputedRef<Workshop[]> | Ref<Workshop[]>
  availableTickets: ComputedRef<TicketOption[]> | Ref<TicketOption[]>
}

export function useSmartTicketPicks({
  selectedWorkshops,
  availableTickets,
}: UseSmartTicketPicksOptions) {
  const suggestedTicket = computed<SuggestedTicket | null>(() => {
    return suggestSmartTicket(selectedWorkshops.value, availableTickets.value)
  })

  return {
    suggestedTicket,
  }
}
