import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../utils/db'
import { profileContacts } from '../../database/schema'

/**
 * One-click unsubscribe (RFC 8058) for the emails a page sends its contacts (RAZ-960): mail
 * apps POST `List-Unsubscribe=One-Click` to the List-Unsubscribe URL. Same link and secret
 * (the contact id) as the GET page; unsubscribes from that page only.
 */
export default defineEventHandler(async (event) => {
  const id = z.string().uuid().safeParse(getQuery(event).id)
  if (!id.success) { setResponseStatus(event, 400); return { ok: false } }
  await useDb().update(profileContacts).set({ status: 'unsubscribed', updatedAt: new Date() }).where(eq(profileContacts.id, id.data))
  return { ok: true }
})
