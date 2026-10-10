<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import { cn } from "@/lib/utils"

/**
 * Field label: text-sm bold, above the control — the dominant label style in
 * the product. `optional` appends a quiet "(optional)"; we mark optional
 * fields, not required ones.
 */
// Runtime props on purpose — see ui/button/Button.vue.
const props = defineProps({
  for: { type: String, default: undefined },
  optional: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})
</script>

<template>
  <label
    :for="props.for"
    data-slot="label"
    :class="cn('inline-block text-sm font-bold text-foreground font-sans leading-snug select-none', props.class)"
  >
    <slot />
    <span v-if="optional" class="font-normal text-muted-foreground"> (optional)</span>
  </label>
</template>
