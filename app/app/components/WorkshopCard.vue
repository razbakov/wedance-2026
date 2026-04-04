<script setup lang="ts">
import type { WorkshopWithId } from '~/types/schedule'
import { getStyleColor, getStyleDisplayName } from '~/utils/styleColors'

const props = defineProps<{
  workshop: WorkshopWithId
  isNow?: boolean
  isPast?: boolean
}>()

const { trackWorkshopTapped } = useAnalytics()

function handleTap() {
  trackWorkshopTapped(props.workshop)
}

const timeRange = computed(
  () => `${props.workshop.startTime} - ${props.workshop.endTime}`
)

const styleLabel = computed(() =>
  props.workshop.danceStyle
    ? getStyleDisplayName(props.workshop.danceStyle)
    : null
)

const styleColor = computed(() => getStyleColor(props.workshop.danceStyle))

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
    :class="[
      'cursor-pointer rounded-lg p-4 transition-shadow hover:shadow-md',
      isNow
        ? 'border-2 ring-1'
        : isPast
          ? 'opacity-60'
          : '',
    ]"
    :style="{
      backgroundColor: isPast ? 'var(--color-bg-page, #F7F7F8)' : 'var(--color-bg, #FFFFFF)',
      border: isNow
        ? `2px solid var(--festival-accent, #E8453C)`
        : `1px solid var(--color-border, #E2E2E4)`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      ...(isNow ? { '--tw-ring-color': 'var(--festival-accent, #E8453C)', '--tw-ring-opacity': '0.2' } : {}),
    }"
    :data-now="isNow || undefined"
    @click="handleTap"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3
            class="text-base font-semibold"
            style="color: var(--color-text-primary, #1A1A1A);"
          >
            {{ workshop.name }}
          </h3>
          <NowBadge v-if="isNow" />
        </div>
        <p
          v-if="workshop.artist"
          class="mt-0.5 text-sm"
          style="color: var(--color-text-secondary, #4A4A4A);"
        >
          {{ workshop.artist }}
        </p>
      </div>
      <!-- Style badge with spec-defined solid colors (QA-004 fix) -->
      <span
        v-if="styleLabel"
        class="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :style="{
          backgroundColor: styleColor,
          color: '#FFFFFF',
        }"
      >
        {{ styleLabel }}
      </span>
    </div>

    <div
      class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"
      style="color: var(--color-text-tertiary, #7A7A7A);"
    >
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
      class="mt-2 text-sm line-clamp-2"
      style="color: var(--color-text-tertiary, #7A7A7A);"
    >
      {{ workshop.description }}
    </p>
  </div>
</template>
