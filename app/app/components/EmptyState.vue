<script setup lang="ts">
/**
 * Empty state component per QA-012 / UI Spec Screen 5.
 *
 * Two variants:
 * - No data: calendar icon + "Schedule coming soon"
 * - Filter empty: "{Style} workshops on {Day}" + "Show all styles" link
 */
defineProps<{
  hasFilters: boolean
  /** Optional: the name of the active style filter for the filter-empty message */
  activeStyleName?: string
  /** Optional: the label of the active day filter for the filter-empty message */
  activeDayLabel?: string
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" style="padding: 64px 16px;">
    <template v-if="hasFilters">
      <!-- Filter empty state -->
      <p style="font-size: 14px; line-height: 1.5; color: var(--color-text-secondary, #4A4A4A);">
        <template v-if="activeStyleName && activeDayLabel">
          No {{ activeStyleName }} workshops on {{ activeDayLabel }}.
        </template>
        <template v-else-if="activeStyleName">
          No {{ activeStyleName }} workshops found.
        </template>
        <template v-else>
          No workshops match your filters.
        </template>
      </p>
      <button
        class="mt-4 font-semibold"
        style="
          font-size: 14px;
          color: var(--color-interactive, #E8453C);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
        "
        @mouseenter="($event.target as HTMLElement).style.textDecoration = 'underline'"
        @mouseleave="($event.target as HTMLElement).style.textDecoration = 'none'"
        @click="$emit('clear')"
      >
        Show all styles
      </button>
    </template>
    <template v-else>
      <!-- No data state -->
      <!-- Calendar icon (Lucide calendar approximation) -->
      <svg
        class="mb-4"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7A7A7A"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>

      <p
        class="font-bold"
        style="font-size: 18px; line-height: 1.3; color: var(--color-text-primary, #1A1A1A);"
      >
        Schedule coming soon
      </p>

      <p
        class="mt-2"
        style="
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-secondary, #4A4A4A);
          max-width: 280px;
          text-align: center;
        "
      >
        We're preparing the workshop schedule for this festival.
      </p>
    </template>
  </div>
</template>
