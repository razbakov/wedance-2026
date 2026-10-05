import * as v from 'valibot'

export type FormResult<TSchema extends v.GenericSchema> =
  | { success: true; data: v.InferOutput<TSchema> }
  | { success: false; error: string; errors: string[] }

/**
 * Validate form state against a schema. On success `data` is the parsed,
 * trimmed payload, ready to send. On failure `error` is the first message (for
 * forms with a single error slot) and `errors` holds one message per invalid
 * field, in schema order.
 */
export function validateForm<TSchema extends v.GenericSchema>(
  schema: TSchema,
  input: v.InferInput<TSchema>,
): FormResult<TSchema> {
  const result = v.safeParse(schema, input)
  if (result.success) return { success: true, data: result.output }

  const seen = new Set<string>()
  const errors: string[] = []
  for (const issue of result.issues) {
    const path = v.getDotPath(issue) ?? ''
    if (seen.has(path)) continue
    seen.add(path)
    errors.push(issue.message)
  }
  return { success: false, error: errors[0]!, errors }
}
