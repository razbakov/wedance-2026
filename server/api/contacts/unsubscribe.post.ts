import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../utils/db'
import { profileContacts } from '../../database/schema'

/**
 * One-click unsubscribe (RFC 8058, RAZ-975): mail apps POST here from the List-Unsubscribe
 * header of a page's email to its contacts. Same rule as the GET link — the id is the secret.
 */
export default defineEventHandler(async (event) => {
  const id = z.string().uuid().safeParse(getQuery(event).id)
  if (!id.success) return { ok: false }
  await useDb().update(profileContacts).set({ status: 'unsubscribed', updatedAt: new Date() }).where(eq(profileContacts.id, id.data))
  return { ok: true }
})
