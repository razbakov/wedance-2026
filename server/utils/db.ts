import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../database/schema'

// Local dev only: route the Neon HTTP driver to scripts/dev/neon-http-proxy.ts
// (a plain local Postgres) instead of Neon. Never set on Vercel.
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const sql = neon(config.databaseUrl)
    _db = drizzle(sql, { schema })
  }
  return _db
}
