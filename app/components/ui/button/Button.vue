<script setup lang="ts">
import type { Component, HTMLAttributes, PropType } from "vue"
import type { ButtonVariants } from "."
import { Loader2 } from "lucide-vue-next"
import { Primitive } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from "."

// Runtime props on purpose. The type-based forms broke twice: extending reka-ui's
// PrimitiveProps fails the Vercel build (RAZ-203), and `extends /* @vue-ignore */`
// silently drops `as` — every Button then rendered as a <div> with no keyboard
// focus, no `disabled` and no pointer cursor. Runtime props can't be dropped.
const props = defineProps({
  as: { type: [String, Object, Function] as PropType<string | Component>, default: "button" },
  asChild: { type: Boolean, default: false },
  variant: { type: String as PropType<ButtonVariants["variant"]>, default: undefined },
  size: { type: String as PropType<ButtonVariants["size"]>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
  disabled: { type: Boolean, default: false },
  // Shows a spinner, sets aria-busy and disables the button while an action runs.
  loading: { type: Boolean, default: false },
  // Re-tints the brand variants (cta, pill, soft, outline-pill) with another colour,
  // e.g. a festival's accent or var(--wd-violet-600). Must reach 4.5:1 with white.
  accent: { type: String, default: undefined },
})

// The variants read --primary (fill/tint), --wd-red-800 (text, lip shadow) and the
// .wd-cta gradient stops; overriding them locally re-tints one button only.
const accentStyle = computed(() => props.accent
  ? {
      "--primary": props.accent,
      "--wd-red-600": props.accent,
      "--wd-red-800": `color-mix(in srgb, ${props.accent} 75%, black)`,
      "--wd-orange-500": `color-mix(in srgb, ${props.accent} 70%, white)`,
    }
  : undefined)
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    :style="accentStyle"
  >
    <Loader2 v-if="loading && !asChild" class="animate-spin" aria-hidden="true" />
    <slot />
  </Primitive>
</template>
