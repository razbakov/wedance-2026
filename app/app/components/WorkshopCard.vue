<script setup lang="ts">
import type { WorkshopWithId } from '~/types/schedule'

const props = defineProps<{
  workshop: WorkshopWithId
}>()

const { trackWorkshopTapped } = useAnalytics()

function handleTap() {
  trackWorkshopTapped(props.workshop)
}

const timeRange = computed(
  () => `${props.workshop.startTime} - ${props.workshop.endTime}`
)

/**
 * Map dance styles to color classes for visual distinction.
 * Uses kebab-case keys matching the schema's controlled vocabulary.
 */
const styleColorMap: Record<string, string> = {
  'salsa-cubana': 'bg-red-100 text-red-800',
  'salsa-linear': 'bg-red-100 text-red-800',
  'bachata': 'bg-purple-100 text-purple-800',
  'kizomba': 'bg-blue-100 text-blue-800',
  'zouk': 'bg-teal-100 text-teal-800',
  'afro-cuban': 'bg-yellow-100 text-yellow-800',
  'reggaeton': 'bg-orange-100 text-orange-800',
  'semba': 'bg-indigo-100 text-indigo-800',
  'cha-cha-cha': 'bg-pink-100 text-pink-800',
  'son': 'bg-amber-100 text-amber-800',
  'rumba': 'bg-lime-100 text-lime-800',
  'lady-styling': 'bg-rose-100 text-rose-800',
  'man-styling': 'bg-sky-100 text-sky-800',
  'musicality': 'bg-emerald-100 text-emerald-800',
  'body-movement': 'bg-cyan-100 text-cyan-800',
  'other': 'bg-gray-100 text-gray-800',
}

const badgeClass = computed(
  () =>
    (props.workshop.danceStyle && styleColorMap[props.workshop.danceStyle]) ||
    'bg-gray-100 text-gray-800'
)

/** Human-readable display name for the dance style. */
const styleDisplayMap: Record<string, string> = {
  'salsa-cubana': 'Salsa Cubana',
  'salsa-linear': 'Salsa Linear',
  'bachata': 'Bachata',
  'kizomba': 'Kizomba',
  'zouk': 'Zouk',
  'afro-cuban': 'Afro-Cuban',
  'reggaeton': 'Reggaeton',
  'semba': 'Semba',
  'cha-cha-cha': 'Cha Cha Cha',
  'son': 'Son',
  'rumba': 'Rumba',
  'lady-styling': 'Lady Styling',
  'man-styling': 'Man Styling',
  'musicality': 'Musicality',
  'body-movement': 'Body Movement',
  'other': 'Other',
}

const styleLabel = computed(() =>
  props.workshop.danceStyle
    ? styleDisplayMap[props.workshop.danceStyle] ?? props.workshop.danceStyle
    : null
)

const levelLabel = computed(() => {
  if (!props.workshop.level) return null
  const map: Record<string, string> = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'all-levels': 'All Levels',
  }
  return map[props.workshop.level] ?? props.workshop.level
})
</script>

<template>
  <div
    class="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    @click="handleTap"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold text-gray-900">
          {{ workshop.name }}
        </h3>
        <p v-if="workshop.artist" class="mt-0.5 text-sm text-gray-600">
          {{ workshop.artist }}
        </p>
      </div>
      <span
        v-if="styleLabel"
        :class="badgeClass"
        class="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      >
        {{ styleLabel }}
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
        {{ workshop.roomName }}
      </span>
      <span v-if="levelLabel" class="inline-flex items-center gap-1">
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
        {{ levelLabel }}
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
