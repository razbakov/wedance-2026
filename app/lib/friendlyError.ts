/**
 * Text for a failed sign-in, sign-up, or password reset (RAZ-1075).
 *
 * The server's own message is shown only for an expected error (wrong
 * password, unknown email, validation). An internal error already arrives
 * sanitised, with a reference; without that reference the raw text is hidden.
 * Anything else (the network, an unknown failure) gets the generic fallback.
 */
const FALLBACK = 'Something went wrong. Please try again.'

export function friendlyError(
  e: { message?: string; data?: { code?: string; ref?: string } } | null | undefined,
): string {
  const code = e?.data?.code
  if (!code || !e?.message) return FALLBACK
  if (code === 'INTERNAL_SERVER_ERROR') return e.data?.ref ? e.message : FALLBACK
  return e.message
}
