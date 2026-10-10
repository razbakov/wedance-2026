<script setup lang="ts">
import type { HTMLAttributes, PropType } from "vue"
import { cn } from "@/lib/utils"
import { errorIdFor, FIELD_KEY, fieldContext, hintIdFor } from "@/lib/field"

/**
 * Label + control + hint + error. Put an Input / Select / Textarea / Checkbox
 * in the default slot; it picks up id, aria-describedby, aria-invalid,
 * aria-required and disabled from here. The error renders with FieldError at
 * id `${id}-error` — the same id useFormValidation's fieldAttrs expects.
 *
 *   <Field id="book-email" label="Email" :error="errors.email">
 *     <Input v-model="form.email" type="email" v-bind="fieldAttrs('email', 'book-email-error')" />
 *   </Field>
 *
 * The slot also receives { id, describedBy, invalid } for custom controls.
 */
// Runtime props on purpose — see ui/button/Button.vue.
const props = defineProps({
  /** id of the control. Auto-generated when omitted; pass one when using useFormValidation. */
  id: { type: String, default: undefined },
  label: { type: String, default: undefined },
  hint: { type: String, default: undefined },
  /** Error message. Truthy = invalid. */
  error: { type: String, default: undefined },
  optional: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Visually hide the label (still read out). Use only when the context labels the field already. */
  hideLabel: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes["class"]>, default: undefined },
})

const autoId = useId()
const controlId = computed(() => props.id || `field-${autoId}`)
const ctx = computed(() => fieldContext({
  id: controlId.value,
  hint: props.hint,
  error: props.error,
  disabled: props.disabled,
  required: props.required,
}))
provide(FIELD_KEY, ctx)
</script>

<template>
  <div data-slot="field" :class="cn('flex flex-col gap-1.5', props.class)">
    <Label v-if="label" :for="controlId" :optional="optional" :class="hideLabel ? 'sr-only' : ''">{{ label }}</Label>
    <slot :id="controlId" :described-by="ctx.describedBy" :invalid="ctx.invalid" />
    <p v-if="hint" :id="hintIdFor(controlId)" class="text-xs text-muted-foreground font-sans leading-snug">{{ hint }}</p>
    <FieldError :id="errorIdFor(controlId)" :message="error" />
  </div>
</template>
