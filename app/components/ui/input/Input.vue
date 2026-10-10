<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import type { ControlVariants } from "."
import { cn } from "@/lib/utils"
import { controlAria, FIELD_KEY } from "@/lib/field"
import { controlVariants } from "."

// Runtime props on purpose — see ui/button/Button.vue (type-based props with
// external types broke the Vercel build and once silently dropped props).
defineOptions({ inheritAttrs: false })

const props = defineProps({
  type: { type: String, default: "text" },
  size: { type: String as PropType<ControlVariants["size"]>, default: undefined },
  /** Force the invalid look + aria-invalid without a surrounding Field. */
  invalid: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})

const model = defineModel({ type: [String, Number] as PropType<string | number | null | undefined>, default: undefined })

const attrs = useAttrs()
const field = inject(FIELD_KEY, null)
const aria = computed(() => controlAria({ ...attrs, invalid: props.invalid }, field?.value))
</script>

<template>
  <input
    v-bind="{ ...$attrs, ...aria }"
    v-model="model"
    :type="type"
    data-slot="input"
    :class="cn(controlVariants({ size }), props.class)"
  >
</template>
