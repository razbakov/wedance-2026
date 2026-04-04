<script setup lang="ts">
defineProps<{
  hasFilters: boolean
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <svg
      class="mb-4 h-16 w-16 text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <template v-if="hasFilters">
      <p class="text-lg font-medium text-gray-600">
        No workshops match your filters
      </p>
      <p class="mt-1 text-sm text-gray-400">
        Try adjusting your selection or clear the filters.
      </p>
      <button
        class="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        @click="$emit('clear')"
      >
        Clear filters
      </button>
    </template>
    <template v-else>
      <p class="text-lg font-medium text-gray-600">
        No schedule available yet
      </p>
      <p class="mt-1 text-sm text-gray-400">
        Check back later for the workshop schedule.
      </p>
    </template>
  </div>
</template>
