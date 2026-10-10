import type { ComputedRef, InjectionKey } from 'vue'

/**
 * Wiring shared by <Field> and the controls inside it (Input, Select, Textarea,
 * Checkbox). Field owns the ids; the control reads them through inject, so a
 * page writes `<Field label="Email" :error="errors.email"><Input v-model="email" /></Field>`
 * and gets `for`/`id`, `aria-describedby` and `aria-invalid` for free.
 */
export interface FieldContext {
  /** id for the control; the <label for> points here. */
  id: string
  /** Space-separated ids of the hint and (when shown) the error, or undefined. */
  describedBy: string | undefined
  invalid: boolean
  disabled: boolean
  required: boolean
}

export const FIELD_KEY: InjectionKey<ComputedRef<FieldContext>> = Symbol('wd-field')

export function hintIdFor(id: string) {
  return `${id}-hint`
}

export function errorIdFor(id: string) {
  return `${id}-error`
}

/** Build the context a Field hands to its control. Error id comes first so screen readers announce the problem before the hint. */
export function fieldContext(opts: {
  id: string
  hint?: string | null
  error?: string | null
  disabled?: boolean
  required?: boolean
}): FieldContext {
  const invalid = !!opts.error
  return {
    id: opts.id,
    describedBy: mergeDescribedBy(invalid ? errorIdFor(opts.id) : undefined, opts.hint ? hintIdFor(opts.id) : undefined),
    invalid,
    disabled: !!opts.disabled,
    required: !!opts.required,
  }
}

/** Join aria-describedby values, dropping blanks and duplicates. undefined when nothing is left. */
export function mergeDescribedBy(...values: (string | null | undefined | false)[]): string | undefined {
  const ids: string[] = []
  for (const v of values) {
    if (!v) continue
    for (const id of v.split(/\s+/)) {
      if (id && !ids.includes(id)) ids.push(id)
    }
  }
  return ids.length ? ids.join(' ') : undefined
}

/**
 * The aria/id attributes a control renders, combining what the page passed
 * directly (e.g. useFormValidation's fieldAttrs) with the surrounding Field.
 * Explicit attributes win for `id`; describedby is merged; invalid is OR-ed.
 */
export function controlAria(
  attrs: { id?: unknown, 'aria-describedby'?: unknown, 'aria-invalid'?: unknown, invalid?: boolean, disabled?: unknown, required?: unknown },
  field?: FieldContext | null,
) {
  const ownInvalid = attrs.invalid === true || attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true'
  const invalid = ownInvalid || !!field?.invalid
  const ownDisabled = attrs.disabled === '' || attrs.disabled === true || attrs.disabled === 'true'
  const required = attrs.required === '' || attrs.required === true || !!field?.required
  return {
    'id': (typeof attrs.id === 'string' && attrs.id) || field?.id || undefined,
    'aria-describedby': mergeDescribedBy(
      typeof attrs['aria-describedby'] === 'string' ? attrs['aria-describedby'] : undefined,
      field?.describedBy,
    ),
    'aria-invalid': invalid ? ('true' as const) : undefined,
    'aria-required': required ? ('true' as const) : undefined,
    'disabled': ownDisabled || !!field?.disabled || undefined,
  }
}
