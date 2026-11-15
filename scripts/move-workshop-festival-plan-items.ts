/**
 * RAZ-983: move "festival" plan items whose event is not a festival (a workshop or
 * class saved from its festival-style page) to "event" items, by the event's id —
 * what `plan.add` now writes for them (`nonFestivalEventId`, server/utils/myPlanFeeds.ts).
 *
 *   bun scripts/move-workshop-festival-plan-items.ts           # dry-run: what would move
 *   bun scripts/move-workshop-festival-plan-items.ts --write   # move; writes a backup first
 *
 * Per item: when the dancer already has the event item, the festival item is deleted;
 * otherwise it becomes the event item (share_going, metadata and created_at kept).
 * Legacy `festivals` rows are left alone (sign-ups and ride shares reference them).
 *
 * Env: DATABASE_URL (check which one before --write!), NEON_FETCH_ENDPOINT for local
 * Postgres. Backup: .backups/move-workshop-plan-items-<time>.json (every row before);
 * rollback = re-insert / restore those rows.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import * as schema from '../server/database/schema'
import { eventIdForNonFestival } from '../server/utils/myPlanFeeds'

const WRITE = process.argv.includes('--write')
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL environment variable not set'); process.exit(1) }
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT
const host = (() => { try { return new URL(dbUrl).host } catch { return '?' } })()
console.error(`move workshop festival plan items · ${WRITE ? 'WRITE' : 'dry-run'} · target DB ${process.env.NEON_FETCH_ENDPOINT ? `${host} via ${process.env.NEON_FETCH_ENDPOINT}` : host}`)
const db: any = drizzle(neon(dbUrl), { schema })
const { planItems, events } = schema

const items = await db.select().from(planItems).where(eq(planItems.itemType, 'festival'))
const slugs = [...new Set<string>(items.map((i: any) => i.itemId))]
const rows = slugs.length
  ? await db
    .select({ id: events.id, slug: events.slug, key: sql<string | null>`${events.festival}->>'key'`, isFestival: events.isFestival })
    .from(events)
    .where(or(inArray(events.slug, slugs), inArray(sql`${events.festival}->>'key'`, slugs)))
  : []

const moves = items
  .map((item: any) => ({ item, eventId: eventIdForNonFestival(item.itemId, rows) }))
  .filter((m: any) => m.eventId)
const existing = moves.length
  ? await db.select({ dancerId: planItems.dancerId, itemId: planItems.itemId }).from(planItems)
    .where(and(eq(planItems.itemType, 'event'), inArray(planItems.itemId, moves.map((m: any) => m.eventId))))
  : []
const has = new Set(existing.map((e: any) => `${e.dancerId}:${e.itemId}`))
const plan = moves.map((m: any) => ({ ...m, action: has.has(`${m.item.dancerId}:${m.eventId}`) ? 'delete' : 'move' as 'delete' | 'move' }))

console.error(`festival plan items ${items.length} · not a festival ${plan.length} (move ${plan.filter((p: any) => p.action === 'move').length}, already an event item → delete ${plan.filter((p: any) => p.action === 'delete').length}) · dancers ${new Set(plan.map((p: any) => p.item.dancerId)).size}`)
const bySlug = plan.reduce((m: Record<string, number>, p: any) => ((m[p.item.itemId] = (m[p.item.itemId] ?? 0) + 1), m), {})
for (const [slug, n] of Object.entries(bySlug)) console.error(`  ${slug} ${n}`)

if (WRITE && plan.length) {
  const dir = join(process.cwd(), '.backups')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `move-workshop-plan-items-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(file, JSON.stringify(plan.map((p: any) => ({ ...p.item, toEventId: p.eventId, action: p.action })), null, 2))
  console.error(`backup: ${file}`)
  for (const p of plan) {
    if (p.action === 'delete') await db.delete(planItems).where(eq(planItems.id, p.item.id))
    else await db.update(planItems).set({ itemType: 'event', itemId: p.eventId }).where(eq(planItems.id, p.item.id))
  }
  console.error(`done: ${plan.length} items`)
}
else if (!WRITE) console.error('dry-run: nothing written (add --write to move them)')
