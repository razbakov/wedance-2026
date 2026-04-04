<script setup lang="ts">
import type { Workshop } from '~/types/schedule'

const props = defineProps<{
  workshop: Workshop
}>()

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const timeRange = computed(
  () => `${formatTime(props.workshop.startTime)} - ${formatTime(props.workshop.endTime)}`
)

/**
 * Map dance styles to color classes for visual distinction.
 * Uses Tailwind background utilities.
 */
const styleColorMap: Record<string, string> = {
  Salsa: 'bg-red-100 text-red-800',
  Bachata: 'bg-purple-100 text-purple-800',
  Kizomba: 'bg-blue-100 text-blue-800',
  Zouk: 'bg-teal-100 text-teal-800',
  Afro: 'bg-yellow-100 text-yellow-800',
  Reggaeton: 'bg-orange-100 text-orange-800',
  Semba: 'bg-indigo-100 text-indigo-800',
  'Cha Cha': 'bg-pink-100 text-pink-800',
  'Ladies Styling': 'bg-rose-100 text-rose-800',
  'Mens Styling': 'bg-sky-100 text-sky-800',
  Musicality: 'bg-emerald-100 text-emerald-800',
}

const badgeClass = computed(
  () => styleColorMap[props.workshop.danceStyle] || 'bg-gray-100 text-gray-800'
)
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-gray-900">
          {{ workshop.name }}
        </h3>
        <p class="mt-0.5 text-sm text-gray-600">
          {{ workshop.artist }}
        </p>
      </div>
      <span
        :class="badgeClass"
        class="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      >
        {{ workshop.danceStyle }}
      </span>
    </div>

    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
      <span class="inline-flex items-center gap-1">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {{ timeRange }}
      </span>
      <span class="inline-flex items-center gap-1">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        {{ workshop.room }}
      </span>
      <span class="inline-flex items-center gap-1">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        {{ workshop.level }}
      </span>
    </div>

    <p
      v-if="workshop.description"
      class="mt-2 text-sm text-gray-500 line-clamp-2"
    >
      {{ workshop.description }}
    </p>
  </div>
</template>
