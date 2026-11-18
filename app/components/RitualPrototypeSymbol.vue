<script setup lang="ts">
/**
 * The phone you hold up: full-bleed color, one shape, a number, a short code.
 * No name and no photo — those stay off the raised screen (RAZ-1060).
 */
import type { RitualMark } from '~/lib/ritualPrototype'

defineProps<{
  mark: RitualMark
  /** Side-by-side phones drop the wordmark and shrink the number. */
  compact?: boolean
}>()
</script>

<template>
  <div
    class="flex h-full w-full flex-col text-white"
    :style="{ background: mark.color }"
    data-testid="ritual-symbol"
  >
    <p class="flex justify-end px-3 pt-3 font-sans font-bold tracking-[0.25em]" :class="compact ? 'text-eyebrow' : 'text-base'">
      {{ mark.code }}
    </p>
    <div class="flex flex-1 flex-col items-center justify-center px-3 pb-4">
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        class="fill-current"
        :class="compact ? 'size-16' : 'size-40'"
      >
        <circle v-if="mark.shape === 'circle'" cx="50" cy="50" r="40" />
        <polygon v-else-if="mark.shape === 'triangle'" points="50,6 96,92 4,92" />
        <rect v-else-if="mark.shape === 'square'" x="12" y="12" width="76" height="76" rx="8" />
        <polygon v-else-if="mark.shape === 'star'" points="50,4 61.5,37 96,37 68,58 79,92 50,72 21,92 32,58 4,37 38.5,37" />
        <template v-else>
          <rect x="38" y="6" width="24" height="88" rx="6" />
          <rect x="6" y="38" width="88" height="24" rx="6" />
        </template>
      </svg>
      <p class="font-sans font-black leading-none tracking-tight" :class="compact ? 'text-4xl' : 'text-8xl'">
        {{ mark.number }}
      </p>
      <p v-if="!compact" class="mt-3 flex items-center gap-1.5 text-sm font-bold tracking-wide">
        <img src="/icon.svg" alt="" class="size-4 brightness-0 invert" />
        wedance
      </p>
    </div>
  </div>
</template>
