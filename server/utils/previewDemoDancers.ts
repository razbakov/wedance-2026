/**
 * The preview walkthrough's Ben Test saved Follow, Salsa and Bachata during
 * onboarding, and a later profile save stored the city before those fields
 * had loaded, so the row was left blank. Fill only that blank row, and only
 * on a preview host. Production and any dancer who already chose a role or a
 * dance are left alone.
 */
import { and, eq, sql } from 'drizzle-orm'
import { dancers } from '../database/schema'

type Db = { update: (...args: any[]) => any }

let started = false

function onPreviewHost(): boolean {
  let site = process.env.NUXT_SITE_URL || process.env.SITE_URL || ''
  try {
    const fromConfig = (globalThis as { useRuntimeConfig?: () => { siteUrl?: string } }).useRuntimeConfig?.()
    if (fromConfig?.siteUrl) site = fromConfig.siteUrl
  } catch { /* unit tests have no runtime config */ }
  try {
    return new URL(site).hostname.endsWith('.dev.wedance.vip')
  } catch {
    return false
  }
}

export async function repairPreviewDemoDancers(db: Db): Promise<void> {
  if (started || !onPreviewHost()) return
  started = true
  try {
    await db.update(dancers).set({
      role: 'follow',
      danceStyles: ['Salsa', 'Bachata'],
    }).where(and(
      eq(dancers.name, 'Ben Test'),
      sql`coalesce(btrim(${dancers.role}), '') = ''`,
      sql`coalesce(${dancers.danceStyles}::text, '[]') in ('[]', 'null', '')`,
    ))
  } catch (err) {
    started = false
    console.warn('[preview] Ben Test profile was not repaired:', err)
  }
}
