<script setup lang="ts">
import type { DanceStyle, FestivalDay } from '~/types/schedule'

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

function toggleDay(date: string) {
  emit('update:day', props.activeDay === date ? null : date)
}

function toggleStyle(style: DanceStyle) {
  emit('update:style', props.activeStyle === style ? null : style)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Day filter -->
    <div>
      <h3 class="mb-2 text-sm font-medium text-gray-700">Day</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="day in days"
          :key="day.date"
          :class="[
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeDay === day.date
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
          @click="toggleDay(day.date)"
        >
          {{ day.label }}
        </button>
      </div>
    </div>

    <!-- Dance style filter -->
    <div>
      <h3 class="mb-2 text-sm font-medium text-gray-700">Dance Style</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="style in styles"
          :key="style"
          :class="[
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            activeStyle === style
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
          @click="toggleStyle(style)"
        >
          {{ style }}
        </button>
      </div>
    </div>
  </div>
</template>
