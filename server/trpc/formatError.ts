import { randomUUID } from 'node:crypto'
import * as Sentry from '@sentry/nuxt'

type ErrorTags = { trpc_path: string; error_ref: string }

type ErrorShape = {
  message: string
  code?: number
  data: { stack?: string; ref?: string }
}

type WithRef<T extends ErrorShape> = Omit<T, 'message' | 'data'> & {
  message: string
  data: Omit<T['data'], 'stack'> & { ref: string; stack: undefined }
}

/**
 * What the browser is allowed to see when a tRPC call fails (RAZ-1075).
 *
 * Expected errors (wrong password, validation) pass through unchanged. An
 * internal error — a database failure, a bug — becomes a short message with a
 * reference. The query text goes to the server log and to Sentry under that
 * reference. With no DSN, Sentry has no client: `captureException` returns an
 * id and does not throw, so the friendly message still goes out.
 */
export function formatTrpcError<T extends ErrorShape>(opts: {
  shape: T
  error: { code: 'INTERNAL_SERVER_ERROR'; cause?: unknown }
  path: string | undefined
  report?: (err: unknown, tags: ErrorTags) => void
}): WithRef<T>
export function formatTrpcError<T extends ErrorShape>(opts: {
  shape: T
  error: { code: string; cause?: unknown }
  path: string | undefined
  report?: (err: unknown, tags: ErrorTags) => void
}): T
export function formatTrpcError<T extends ErrorShape>(opts: {
  shape: T
  error: { code: string; cause?: unknown }
  path: string | undefined
  report?: (err: unknown, tags: ErrorTags) => void
}): T | WithRef<T> {
  const { shape, error, path } = opts
  if (error.code !== 'INTERNAL_SERVER_ERROR') return shape
  const ref = randomUUID().slice(0, 8)
  const tags: ErrorTags = { trpc_path: path ?? 'unknown', error_ref: ref }
  const report = opts.report ?? ((err, reported) => {
    Sentry.captureException(err, { tags: reported })
  })
  console.error(`[trpc] ${path ?? '?'} failed (ref ${ref}):`, error.cause ?? error)
  report(error.cause ?? error, tags)
  return {
    ...shape,
    message: `Something went wrong on our side. Please try again. If it keeps happening, contact us with reference ${ref}.`,
    data: { ...shape.data, stack: undefined, ref },
  }
}
