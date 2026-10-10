<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import type { ControlVariants } from "@/components/ui/input"
import { ChevronDown } from "lucide-vue-next"
import { cn } from "@/lib/utils"
import { controlAria, FIELD_KEY } from "@/lib/field"
import { controlVariants } from "@/components/ui/input"

/**
 * Native <select>, styled. Native on purpose: the OS picker is the best
 * one-of-many control on phones (wheel on iOS, sheet on Android), it is
 * accessible for free and it needs no JS to work.
 */
// Runtime props on purpose — see ui/button/Button.vue.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** Shortcut for simple lists. Strings, or { label, value, disabled }. Slot <option>s also work. */
  options: { type: Array as PropType<(string | { label: string, value: string | number, disabled?: boolean })[]>, default: undefined },
  /** Shown while nothing is picked (value ""). Not selectable again once a choice is made. */
  placeholder: { type: String, default: undefined },
  size: { type: String as PropType<ControlVariants["size"]>, default: undefined },
  invalid: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})

const model = defineModel({ type: [String, Number] as PropType<string | number | null | undefined>, default: "" })

const attrs = useAttrs()
const field = inject(FIELD_KEY, null)
const aria = computed(() => controlAria({ ...attrs, invalid: props.invalid }, field?.value))
const normalized = computed(() => (props.options ?? []).map(o => (typeof o === "string" ? { label: o, value: o } : o)))
const empty = computed(() => model.value === "" || model.value == null)
</script>

<template>
  <div class="relative w-full" data-slot="select">
    <select
      v-bind="{ ...$attrs, ...aria }"
      v-model="model"
      :class="cn(controlVariants({ size }), 'appearance-none pr-10 cursor-pointer', empty && placeholder ? 'text-muted-foreground/80' : '', props.class)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="o in normalized" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
      <slot />
    </select>
    <ChevronDown
      class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
      aria-hidden="true"
    />
  </div>
</template>
