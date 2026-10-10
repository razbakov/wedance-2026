<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import { cn } from "@/lib/utils"
import { controlAria, FIELD_KEY } from "@/lib/field"
import { controlVariants } from "@/components/ui/input"

// Runtime props on purpose — see ui/button/Button.vue.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  rows: { type: [Number, String], default: 4 },
  /** Let the user drag the height. Off for short fixed boxes. */
  resize: { type: Boolean, default: true },
  invalid: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})

const model = defineModel({ type: String as PropType<string | null | undefined>, default: undefined })

const attrs = useAttrs()
const field = inject(FIELD_KEY, null)
const aria = computed(() => controlAria({ ...attrs, invalid: props.invalid }, field?.value))
</script>

<template>
  <textarea
    v-bind="{ ...$attrs, ...aria }"
    v-model="model"
    :rows="rows"
    data-slot="textarea"
    :class="cn(controlVariants(), 'h-auto min-h-24 py-2.5 leading-relaxed', resize ? 'resize-y' : 'resize-none', props.class)"
  />
</template>
