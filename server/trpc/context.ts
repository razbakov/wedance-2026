import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { eq, and, gt } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { dancers, sessions } from '../database/schema'

export interface Context {
  db: ReturnType<typeof useDb>
  dancerId: string | null
  isAdmin: boolean
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const db = useDb()

  const authHeader = opts.req.headers.get('authorization')
  let dancerId: string | null = null
  let isAdmin = false

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    // Look up session by token, check not expired
    const [session] = await db
      .select({ dancerId: sessions.dancerId })
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date()),
        ),
      )

    if (session) {
      const [dancer] = await db
        .select({ id: dancers.id, isAdmin: dancers.isAdmin })
        .from(dancers)
        .where(eq(dancers.id, session.dancerId))

      if (dancer) {
        dancerId = dancer.id
        isAdmin = dancer.isAdmin ?? false
      }
    }
  }

  return { db, dancerId, isAdmin }
}
