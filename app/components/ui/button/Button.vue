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
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
  >
    <Loader2 v-if="loading && !asChild" class="animate-spin" aria-hidden="true" />
    <slot />
  </Primitive>
</template>
