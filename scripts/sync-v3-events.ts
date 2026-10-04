#!/usr/bin/env bun
/**
 * Mirror upcoming wedance.vip (v3) events into the 2026 `events` table.
 *
 * Source: Firestore `posts` where type == "event" and startDate >= now (all
 * cities), read through the Firestore REST API with the v3 service account.
 * READ-ONLY against v3 — the script never writes to Firestore.
 *
 * Target: `events` rows with source='wedance-v3', source_id=<v3 post id>
 * (upsert key), archived=false, published=true. Upcoming rows that v3 no longer
 * lists (deleted / unlisted) are set archived=true. Idempotent — safe to re-run.
 * Rollback: DELETE FROM events WHERE source = 'wedance-v3';
 *
 * Usage:
 *   bun run sync:v3-events              # dry-run (default): fetch + map + diff, no DB writes
 *   bun run sync:v3-events --write      # apply migration 0021 (idempotent) + upsert + archive
 *   bun run sync:v3-events --json       # machine-readable summary
 *
 * Env:
 *   DATABASE_URL                         target Postgres (Neon). Check which one before --write!
 *   NEON_FETCH_ENDPOINT                  optional, local Postgres via scripts/dev/neon-http-proxy.ts
 *   WEDANCE_V3_SERVICE_ACCOUNT           v3 Firebase service-account JSON (string), or
 *   WEDANCE_V3_SERVICE_ACCOUNT_FILE      path to it (default ~/Secrets/wedance.json)
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../server/database/schema'
import { ensureEventsSchema, fetchUpcomingV3Posts, syncV3Events, type ServiceAccount } from '../server/utils/v3EventSync'

const args = new Set(process.argv.slice(2))
const WRITE = args.has('--write')
const JSON_OUT = args.has('--json')
const log = (s: string) => { if (!JSON_OUT) console.error(s) }

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL environment variable not set'); process.exit(1) }
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT

function loadServiceAccount(): ServiceAccount {
  if (process.env.WEDANCE_V3_SERVICE_ACCOUNT) return JSON.parse(process.env.WEDANCE_V3_SERVICE_ACCOUNT)
  const file = process.env.WEDANCE_V3_SERVICE_ACCOUNT_FILE ?? join(homedir(), 'Secrets', 'wedance.json')
  return JSON.parse(readFileSync(file, 'utf8'))
}

const host = (() => { try { return new URL(dbUrl).host } catch { return '?' } })()
const target = process.env.NEON_FETCH_ENDPOINT ? `${host} via ${process.env.NEON_FETCH_ENDPOINT}` : host
log(`v3 → 2026 event sync · ${WRITE ? 'WRITE' : 'dry-run'} · target DB ${target}`)

const db = drizzle(neon(dbUrl), { schema })
const sa = loadServiceAccount()

const t0 = Date.now()
const docs = await fetchUpcomingV3Posts(sa)
log(`  fetched ${docs.length} upcoming posts from Firestore project ${sa.project_id} (${Date.now() - t0} ms)`)

if (WRITE) {
  const migration = readFileSync(join(import.meta.dir, '..', 'server', 'database', 'migrations', '0021_events_v3_sync.sql'), 'utf8')
  await ensureEventsSchema(db, migration)
  log('  schema: migration 0021 applied (idempotent)')
}

const summary = await syncV3Events({ db, docs, write: WRITE, log })

if (JSON_OUT) {
  console.log(JSON.stringify({ target, ...summary }, null, 2))
} else {
  const top = (o: Record<string, number>, n = 12) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ') || '—'
  console.log(`
Summary (${summary.mode})
  fetched    ${summary.fetched}   (v3 posts with startDate >= now, any type)
  eligible   ${summary.eligible}
  created    ${summary.created}
  updated    ${summary.updated}
  unchanged  ${summary.unchanged}
  archived   ${summary.archived}   (still-upcoming rows no longer listed in v3)
  skipped    ${Object.values(summary.skipped).reduce((a, b) => a + b, 0)}   ${top(summary.skipped)}
  cities     ${Object.keys(summary.byCity).length}   ${top(summary.byCity)}
  unmapped styles (kept as humanised labels): ${top(summary.unmappedStyles)}${summary.schemaReady ? '' : '\n  NOTE: target DB lacks migration 0021 — run with --write (applies it) or apply the SQL first.'}
`)
}
process.exit(0)
