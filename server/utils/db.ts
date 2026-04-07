import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const sql = neon(config.databaseUrl)
    _db = drizzle(sql, { schema })
  }
  return _db
}
