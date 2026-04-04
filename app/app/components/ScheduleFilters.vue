<script setup lang="ts">
import type { DanceStyle, FestivalDay } from '~/types/schedule'
import { getStyleColor, getStyleDisplayName } from '~/utils/styleColors'

const props = defineProps<{
  days: FestivalDay[]
  styles: DanceStyle[]
  activeDay: string | null
  activeStyle: DanceStyle | null
}>()

const emit = defineEmits<{
  'update:day': [value: string | null]
  'update:style': [value: DanceStyle | null]
}>()

function selectDay(date: string) {
  emit('update:day', props.activeDay === date ? null : date)
}

function selectStyle(style: DanceStyle | null) {
  emit('update:style', style)
}
</script>

<template>
  <!-- DayTabs: sticky below TopBar (QA-008) -->
  <div
    class="sticky z-20"
    style="
      top: 56px;
      background: var(--color-bg, #FFFFFF);
      border-bottom: 1px solid var(--color-border, #E2E2E4);
      padding: 12px 16px;
    "
  >
    <div class="flex gap-2 overflow-x-auto" style="-ms-overflow-style: none; scrollbar-width: none;">
      <button
        v-for="day in days"
        :key="day.date"
        :style="
          activeDay === day.date
            ? {
                backgroundColor: 'var(--festival-accent, #E8453C)',
                color: '#FFFFFF',
                border: 'none',
              }
            : {
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary, #4A4A4A)',
                border: '1px solid var(--color-border, #E2E2E4)',
              }
        "
        style="
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 100ms ease-out;
          cursor: pointer;
          line-height: 1;
        "
        @click="selectDay(day.date)"
      >
        {{ day.label }}
      </button>
    </div>
  </div>

  <!-- StyleChipRow: sticky below DayTabs (QA-009) -->
  <div
    class="sticky z-20"
    style="
      top: 108px;
      background: var(--color-bg-page, #F7F7F8);
      padding: 12px 16px 4px;
    "
  >
    <div class="flex gap-2 overflow-x-auto" style="-ms-overflow-style: none; scrollbar-width: none;">
      <!-- "All" chip (QA-009) -->
      <button
        :style="
          activeStyle === null
            ? {
                backgroundColor: 'var(--color-interactive, #E8453C)',
                color: '#FFFFFF',
                border: '1px solid var(--color-interactive, #E8453C)',
              }
            : {
                backgroundColor: 'var(--color-bg, #FFFFFF)',
                color: 'var(--color-text-secondary, #4A4A4A)',
                border: '1px solid var(--color-border, #E2E2E4)',
              }
        "
        style="
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 100ms ease-out;
          cursor: pointer;
          line-height: 1.5;
        "
        @click="selectStyle(null)"
      >
        All
      </button>

      <!-- Style chips -->
      <button
        v-for="style in styles"
        :key="style"
        :style="
          activeStyle === style
            ? {
                backgroundColor: getStyleColor(style),
                color: '#FFFFFF',
                border: `1px solid ${getStyleColor(style)}`,
              }
            : {
                backgroundColor: 'var(--color-bg, #FFFFFF)',
                color: 'var(--color-text-secondary, #4A4A4A)',
                border: '1px solid var(--color-border, #E2E2E4)',
              }
        "
        style="
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 100ms ease-out;
          cursor: pointer;
          line-height: 1.5;
        "
        @click="selectStyle(style)"
      >
        {{ getStyleDisplayName(style) }}
      </button>
    </div>
  </div>
</template>
