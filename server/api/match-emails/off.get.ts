import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { dancers } from '../../database/schema'
import { verifyMatchEmailsOff } from '../../utils/meetMatchNotify'

/** "Stop these emails" in a "<name> said yes too" email (RAZ-985). The signed `sig` is the proof. */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  const page = (msg: string) => `<!doctype html><meta name="viewport" content="width=device-width"><title>Emails</title><body style="font-family:sans-serif;max-width:460px;margin:15vh auto;padding:0 20px;color:#333"><p>${msg}</p></body>`
  const id = verifyMatchEmailsOff(getQuery(event).sig as string | undefined)
  if (!id) return page('This link doesn’t work any more. You can turn these emails off in Settings.')
  await useDb().update(dancers).set({ matchEmails: false }).where(eq(dancers.id, id))
  return page('Done: no more “said yes too” emails. Your dance friends still show on My plan, and you can turn the emails back on in Settings.')
})
