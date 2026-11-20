import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { dancers } from '../../database/schema'
import { verifyMatchEmailsOff } from '../../utils/meetMatchNotify'

/** One-click unsubscribe (RFC 8058) from the List-Unsubscribe header of a match email (RAZ-985). */
export default defineEventHandler(async (event) => {
  const id = verifyMatchEmailsOff(getQuery(event).sig as string | undefined)
  if (!id) return { ok: false }
  await useDb().update(dancers).set({ matchEmails: false }).where(eq(dancers.id, id))
  return { ok: true }
})
