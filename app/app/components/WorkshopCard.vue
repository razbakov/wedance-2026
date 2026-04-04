<script setup lang="ts">
import type { WorkshopWithId } from '~/types/schedule'
import { getStyleColor, getStyleDisplayName, getLevelDisplayName } from '~/utils/styleColors'

const props = defineProps<{
  workshop: WorkshopWithId
  isNow?: boolean
  isPast?: boolean
}>()

const emit = defineEmits<{
  tap: [workshop: WorkshopWithId]
}>()

const { trackWorkshopTapped } = useAnalytics()

function handleTap() {
  trackWorkshopTapped(props.workshop)
  emit('tap', props.workshop)
}

const timeRange = computed(
  () => `${props.workshop.startTime} - ${props.workshop.endTime}`
)

const borderColor = computed(() => getStyleColor(props.workshop.danceStyle))

const styleLabel = computed(() => getStyleDisplayName(props.workshop.danceStyle))

const levelLabel = computed(() => getLevelDisplayName(props.workshop.level))
</script>

<template>
  <div
    :class="[
      'workshop-card cursor-pointer flex flex-col',
      'transition-all',
      isPast ? 'opacity-60' : '',
    ]"
    :style="{
      width: 'var(--card-width, 140px)',
      minWidth: 'var(--card-width, 140px)',
      minHeight: 'var(--card-min-height, 120px)',
      backgroundColor: 'var(--color-bg, #FFFFFF)',
      borderRadius: 'var(--card-border-radius, 8px)',
      borderLeft: `4px solid ${borderColor}`,
      boxShadow: isNow
        ? `0 2px 6px rgba(0,0,0,0.15), 0 0 0 2px var(--festival-accent, #E8453C)`
        : '0 1px 3px rgba(0,0,0,0.08)',
      padding: '8px 12px 12px',
      scrollSnapAlign: 'start',
    }"
    :data-now="isNow || undefined"
    @click="handleTap"
  >
    <!-- Room label -->
    <span
      class="font-semibold uppercase"
      style="
        font-size: 11px;
        letter-spacing: 0.5px;
        line-height: 1.3;
        color: var(--color-text-tertiary, #7A7A7A);
      "
    >
      {{ workshop.roomName }}
    </span>

    <!-- Workshop name -->
    <h3
      class="mt-1 font-semibold leading-tight"
      style="
        font-size: 15px;
        line-height: 1.3;
        color: var(--color-text-primary, #1A1A1A);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      "
    >
      {{ workshop.name }}
    </h3>

    <!-- Artist -->
    <p
      v-if="workshop.artist"
      class="mt-1 truncate"
      style="
        font-size: 13px;
        line-height: 1.3;
        color: var(--color-text-secondary, #4A4A4A);
      "
    >
      {{ workshop.artist }}
    </p>

    <!-- Time -->
    <p
      class="mt-1"
      style="
        font-size: 13px;
        color: var(--color-text-secondary, #4A4A4A);
      "
    >
      {{ timeRange }}
    </p>

    <!-- Badges row: pushed to bottom via mt-auto -->
    <div class="mt-auto flex flex-wrap items-center gap-1 pt-1">
      <!-- NOW badge -->
      <NowBadge v-if="isNow" />

      <!-- Style badge -->
      <span
        v-if="styleLabel"
        class="inline-block font-semibold"
        :style="{
          fontSize: '11px',
          lineHeight: '1.3',
          backgroundColor: borderColor,
          color: '#FFFFFF',
          borderRadius: '10px',
          padding: '2px 8px',
        }"
      >
        {{ styleLabel }}
      </span>

      <!-- Level badge -->
      <span
        v-if="levelLabel"
        class="inline-block font-semibold"
        style="
          font-size: 11px;
          line-height: 1.3;
          background-color: var(--color-bg-page, #F7F7F8);
          color: var(--color-text-secondary, #4A4A4A);
          border-radius: 10px;
          padding: 2px 8px;
        "
      >
        {{ levelLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.workshop-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}
.workshop-card:active {
  transform: scale(0.97);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 100ms ease-out;
}
</style>
