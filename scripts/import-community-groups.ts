#!/usr/bin/env bun
/**
 * Import the organisers' WhatsApp / Telegram groups into the local group directory (RAZ-861).
 *
 * Source: Google Sheet "Outreach CRM", tab "Groups" (its CSV export; the sheet is link-readable),
 * or a CSV file with the same columns (`--csv <path>`). Mapping + dedupe rules:
 * server/utils/communityGroupImport.ts.
 *
 *   bun scripts/import-community-groups.ts                 # dry-run: what would be added, what is left out
 *   bun scripts/import-community-groups.ts --write         # insert
 *   bun scripts/import-community-groups.ts --csv groups.csv [--json]
 *
 * Insert-only: rows go in as community_groups (kind 'community', status 'visible', source 'import',
 * unverified). A group whose invite_key is already in the directory (any status, any kind) is
 * skipped and never changed; nothing is deleted. Re-running adds nothing new.
 *
 * Env: DATABASE_URL (target — the Vercel-pulled .env is PRODUCTION; check it before --write).
 * Rollback: DELETE FROM community_groups WHERE source = 'import';
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { buildCityIndex } from '../server/utils/v3EventSync'
import { addCitiesToIndex, mapGroupSheet, parseCsv, planGroupImport, groupImportRow, type GroupSkipped } from '../server/utils/communityGroupImport'

const SHEET_ID = '1oKO8qm2nzI_V6anN6tKte3ymqW-NfcDjGgzoq0Qsd5A'
const GROUPS_TAB_GID = '437789097'

const argv = process.argv.slice(2)
const WRITE = argv.includes('--write')
const JSON_OUT = argv.includes('--json')
const csvPath = argv.includes('--csv') ? argv[argv.indexOf('--csv') + 1] : null

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL environment variable not set'); process.exit(1) }
const host = (u: string) => { try { return new URL(u).host } catch { return '?' } }
console.error(`community groups import · ${WRITE ? 'WRITE' : 'dry-run'} · target DB ${host(dbUrl)}`)

let csv: string
if (csvPath) csv = readFileSync(csvPath, 'utf8')
else {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GROUPS_TAB_GID}`)
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/csv')) {
    console.error(`Could not read the sheet (${res.status}). Export the "Groups" tab as CSV and pass --csv <path>.`)
    process.exit(1)
  }
  csv = await res.text()
}

const db = new pg.Client({ connectionString: dbUrl })
await db.connect()
try {
  const { rows: profileCities } = await db.query<{ city: string; citySlug: string }>(
    `SELECT city, city_slug AS "citySlug" FROM profiles WHERE city IS NOT NULL AND city_slug IS NOT NULL
     GROUP BY city, city_slug ORDER BY count(*) DESC`)
  const { rows: cityRows } = await db.query<{ slug: string; name: string; localName: string | null; altNames: string[] }>(
    `SELECT slug, name, local_name AS "localName", alt_names AS "altNames" FROM cities`)
  const idx = addCitiesToIndex(buildCityIndex(profileCities), cityRows)

  const { groups, skipped } = mapGroupSheet(parseCsv(csv), idx)
  const { rows: existing } = await db.query<{ key: string }>(`SELECT invite_key AS key FROM community_groups WHERE invite_key IS NOT NULL`)
  const plan = planGroupImport(groups, existing.map(r => r.key))

  let inserted = 0
  if (WRITE) {
    for (const g of plan.insert) {
      const r = groupImportRow(g)
      const res = await db.query(
        `INSERT INTO community_groups (city_slug, name, platform, invite_url, invite_key, styles, source, status, kind, verified)
         VALUES ($1, $2, $3, $4, $5, $6::json, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [r.citySlug, r.name, r.platform, r.inviteUrl, r.inviteKey, JSON.stringify(r.styles), r.source, r.status, r.kind, r.verified])
      inserted += res.rowCount ?? 0
    }
  }

  const byCity = new Map<string, number>()
  for (const g of plan.insert) byCity.set(g.citySlug, (byCity.get(g.citySlug) ?? 0) + 1)
  const reasons = new Map<string, GroupSkipped[]>()
  for (const s of skipped) reasons.set(s.reason, [...(reasons.get(s.reason) ?? []), s])
  const summary = {
    mode: WRITE ? 'write' : 'dry-run',
    sheetRows: groups.length + skipped.length,
    matched: groups.length,
    toInsert: plan.insert.length,
    inserted,
    alreadyInDirectory: plan.inDirectory.length,
    repeatedInSheet: plan.repeated.length,
    skipped: Object.fromEntries([...reasons].map(([k, v]) => [k, v.length])),
    cities: Object.fromEntries([...byCity].sort((a, b) => b[1] - a[1])),
    unknownCities: [...new Set((reasons.get('unknown_city') ?? []).map(s => s.city))],
  }

  if (JSON_OUT) console.log(JSON.stringify({ ...summary, insert: plan.insert, skippedRows: skipped }, null, 2))
  else {
    console.log(`\nSheet: ${summary.sheetRows} groups · ${summary.matched} with a known city`)
    console.log(`${WRITE ? 'Inserted' : 'Would insert'}: ${WRITE ? inserted : plan.insert.length} · already in the directory: ${plan.inDirectory.length} · repeated in the sheet: ${plan.repeated.length}`)
    console.log(`By city: ${[...byCity].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', ')}`)
    for (const g of plan.insert) console.log(`  + ${g.citySlug.padEnd(22)} ${g.platform.padEnd(8)} ${g.name}${g.styles.length ? ` (${g.styles.join(', ')})` : ''}`)
    for (const g of plan.inDirectory) console.log(`  = ${g.citySlug.padEnd(22)} in directory  ${g.name}`)
    for (const g of plan.repeated) console.log(`  = ${g.citySlug.padEnd(22)} repeated      ${g.name} (line ${g.line})`)
    console.log('\nLeft out:')
    for (const s of skipped) console.log(`  - line ${String(s.line).padEnd(4)} ${s.reason.padEnd(14)} ${s.name || '(no name)'}${s.city ? ` · ${s.city}` : ''}`)
  }
} finally {
  await db.end()
}
