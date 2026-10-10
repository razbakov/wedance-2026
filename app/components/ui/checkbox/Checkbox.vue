<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import { cn } from "@/lib/utils"
import { controlAria, FIELD_KEY } from "@/lib/field"

/**
 * Native checkbox tinted with the brand red via accent-color. With a default
 * slot it renders its own <label> — the whole row is the hit target (≥44px).
 */
// Runtime props on purpose — see ui/button/Button.vue.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  invalid: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})

const model = defineModel({ type: Boolean, default: false })

const attrs = useAttrs()
const slots = useSlots()
const field = inject(FIELD_KEY, null)
const aria = computed(() => controlAria({ ...attrs, invalid: props.invalid }, field?.value))

const boxClass = "peer size-[18px] shrink-0 rounded accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-offset-1 aria-[invalid=true]:outline-destructive"
</script>

<template>
  <label
    v-if="slots.default"
    data-slot="checkbox"
    :class="cn('inline-flex min-h-11 items-center gap-3 text-sm text-foreground font-sans cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60', props.class)"
  >
    <input v-bind="{ ...$attrs, ...aria }" v-model="model" type="checkbox" :class="boxClass">
    <span class="leading-snug"><slot /></span>
  </label>
  <input
    v-else
    v-bind="{ ...$attrs, ...aria }"
    v-model="model"
    type="checkbox"
    data-slot="checkbox"
    :class="cn(boxClass, props.class)"
  >
</template>
