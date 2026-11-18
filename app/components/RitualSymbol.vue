<script setup lang="ts">
/**
 * The screen turned toward the other person (RAZ-1071): full-bleed color,
 * one shape and a number. The same three things are on the other phone.
 * No name and no extra code.
 */
import { markPhrase, type RitualMark } from '#shared/utils/ritual'

const props = defineProps<{
  mark: RitualMark
}>()

const phrase = computed(() => markPhrase(props.mark))
</script>

<template>
  <div
    class="flex h-full w-full flex-col text-white"
    :style="{ background: mark.color }"
    data-testid="ritual-symbol"
    role="img"
    :aria-label="phrase"
  >
    <div class="flex flex-1 flex-col items-center justify-center px-4 pb-6">
      <svg viewBox="0 0 100 100" aria-hidden="true" class="size-40 fill-current">
        <circle v-if="mark.shape === 'circle'" cx="50" cy="50" r="40" />
        <polygon v-else-if="mark.shape === 'triangle'" points="50,6 96,92 4,92" />
        <rect v-else-if="mark.shape === 'square'" x="12" y="12" width="76" height="76" rx="8" />
        <polygon v-else-if="mark.shape === 'star'" points="50,4 61.5,37 96,37 68,58 79,92 50,72 21,92 32,58 4,37 38.5,37" />
        <template v-else>
          <rect x="38" y="6" width="24" height="88" rx="6" />
          <rect x="6" y="38" width="88" height="24" rx="6" />
        </template>
      </svg>
      <p class="font-sans text-8xl font-black leading-none tracking-tight">{{ mark.number }}</p>
      <p class="mt-3 flex items-center gap-1.5 text-sm font-bold tracking-wide">
        <img src="/icon.svg" alt="" class="size-4 brightness-0 invert">
        wedance
      </p>
    </div>
  </div>
</template>
