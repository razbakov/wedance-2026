import * as v from 'valibot'

/** First message per invalid field, keyed by dot path (`email`, `rows.0.name`). */
export type FieldErrors = Partial<Record<string, string>>

export type FormResult<TSchema extends v.GenericSchema> =
  | { success: true; data: v.InferOutput<TSchema> }
  | { success: false; error: string; errors: string[]; fieldErrors: FieldErrors }

/**
 * Validate form state against a schema. On success `data` is the parsed,
 * trimmed payload, ready to send. On failure `fieldErrors` maps each invalid
 * field to its first message; `errors` lists those messages in schema order and
 * `error` is the first of them.
 */
export function validateForm<TSchema extends v.GenericSchema>(
  schema: TSchema,
  input: v.InferInput<TSchema>,
): FormResult<TSchema> {
  const result = v.safeParse(schema, input)
  if (result.success) return { success: true, data: result.output }

  const fieldErrors: FieldErrors = {}
  const errors: string[] = []
  for (const issue of result.issues) {
    const path = v.getDotPath(issue) ?? ''
    if (path in fieldErrors) continue
    fieldErrors[path] = issue.message
    errors.push(issue.message)
  }
  return { success: false, error: errors[0]!, errors, fieldErrors }
}
