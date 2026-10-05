import { computed, nextTick, ref, toValue, type MaybeRefOrGetter } from 'vue'
import type { GenericSchema, InferInput } from 'valibot'
import { validateForm, type FieldErrors } from '#shared/validation'

/**
 * Per-field validation state for a form, driven by a valibot schema.
 *
 * Errors stay hidden until a submit fails; then every invalid field shows its
 * message at once, and each one clears live as that field is fixed. A
 * successful submit — or reset() — hides them again.
 *
 *   const { errors, validate, reset, fieldAttrs } = useFormValidation(Schema, form)
 *   const result = validate(); if (!result.success) return; send(result.data)
 *   <input v-bind="fieldAttrs('email', 'signup-email-error')"> <FieldError id="signup-email-error" :message="errors.email" />
 */
export function useFormValidation<TSchema extends GenericSchema>(
  schema: MaybeRefOrGetter<TSchema>,
  state: MaybeRefOrGetter<InferInput<TSchema>>,
) {
  const showErrors = ref(false)
  const result = computed(() => validateForm(toValue(schema), toValue(state)))
  const errors = computed<FieldErrors>(() =>
    showErrors.value && !result.value.success ? result.value.fieldErrors : {},
  )

  // field → id of its FieldError, so a failed submit can focus the first invalid input.
  const errorIds = new Map<string, string>()

  /** aria-invalid / aria-describedby for the input bound to `field`. */
  function fieldAttrs(field: string, errorId: string) {
    errorIds.set(field, errorId)
    const invalid = !!errors.value[field]
    return {
      'aria-invalid': invalid ? ('true' as const) : undefined,
      'aria-describedby': invalid ? errorId : undefined,
    }
  }

  function validate() {
    const current = result.value
    showErrors.value = !current.success
    if (!current.success && import.meta.client) {
      const first = Object.keys(current.fieldErrors).find(field => errorIds.has(field))
      const id = first && errorIds.get(first)
      if (id) nextTick(() => document.querySelector<HTMLElement>(`[aria-describedby~="${id}"]`)?.focus())
    }
    return current
  }

  function reset() {
    showErrors.value = false
  }

  return { errors, validate, reset, fieldAttrs }
}
