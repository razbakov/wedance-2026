<script setup lang="ts">
import { PartyPopper, GraduationCap } from 'lucide-vue-next'
import { EVENT_KINDS, type EventKind } from '~/lib/cityWeek'

/**
 * All / Parties / Classes on the city page (RAZ-1018). One choice at a time;
 * tapping the active one goes back to All. The page keeps it in `?type=`.
 *
 *   <CityKindFilter v-model="selectedKind" />
 */
const props = defineProps<{ modelValue: EventKind | '' }>()
const emit = defineEmits<{ 'update:modelValue': [value: EventKind | ''] }>()

const icons = { party: PartyPopper, class: GraduationCap } as const

function pick(k: EventKind | '') {
  emit('update:modelValue', k && props.modelValue === k ? '' : k)
}
</script>

<template>
  <div role="group" aria-label="Show parties or classes" data-testid="city-kind-filter" class="flex flex-wrap items-center gap-1.5">
    <ToggleChip
      variant="ink"
      :pressed="!modelValue"
      class="px-3.5 py-1.5 text-sm font-sans"
      data-kind="all"
      @click="pick('')"
    >
      All
    </ToggleChip>
    <ToggleChip
      v-for="k in EVENT_KINDS"
      :key="k.key"
      variant="ink"
      :pressed="modelValue === k.key"
      class="px-3.5 py-1.5 text-sm font-sans"
      :data-kind="k.key"
      @click="pick(k.key)"
    >
      <component :is="icons[k.key]" class="size-3.5" aria-hidden="true" />
      {{ k.label }}
    </ToggleChip>
  </div>
</template>
