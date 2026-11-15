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
 *   bun scripts/import-community-groups.ts --fill-admins           # dry-run: admins the sheet would add (RAZ-967)
 *   bun scripts/import-community-groups.ts --fill-admins --write   # fill them
 *
 * Insert-only: rows go in as community_groups (kind 'community', status 'visible', source 'import',
 * unverified). A group whose invite_key is already in the directory (any status, any kind) is
 * skipped and never changed; nothing is deleted. Re-running adds nothing new. New groups carry the
 * sheet's "Admin" / "Admin Number" as admin_name / admin_contact.
 *
 * --fill-admins (RAZ-967) inserts nothing: for groups already in the directory it fills
 * admin_name / admin_contact from the sheet, ONLY where WeDance has them empty (checked again in
 * the UPDATE, so a value typed meanwhile wins). Contacts are personal data: the output names the
 * groups and which field would be filled, never the number itself.
 *
 * Env: DATABASE_URL (target — the Vercel-pulled .env is PRODUCTION; check it before --write).
 * Rollback: DELETE FROM community_groups WHERE source = 'import';
 * (--fill-admins has no automatic rollback: the run prints the ids it filled — clear those by hand
 *  with UPDATE community_groups SET admin_name = NULL, admin_contact = NULL WHERE id IN (…).)
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { buildCityIndex } from '../server/utils/v3EventSync'
import { addCitiesToIndex, mapGroupSheet, parseCsv, planAdminFill, planGroupImport, groupImportRow, type DirectoryAdmin, type GroupSkipped } from '../server/utils/communityGroupImport'

const SHEET_ID = '1oKO8qm2nzI_V6anN6tKte3ymqW-NfcDjGgzoq0Qsd5A'
const GROUPS_TAB_GID = '437789097'

const argv = process.argv.slice(2)
const WRITE = argv.includes('--write')
const JSON_OUT = argv.includes('--json')
const FILL_ADMINS = argv.includes('--fill-admins')
const csvPath = argv.includes('--csv') ? argv[argv.indexOf('--csv') + 1] : null

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL environment variable not set'); process.exit(1) }
const host = (u: string) => { try { return new URL(u).host } catch { return '?' } }
console.error(`community groups ${FILL_ADMINS ? 'admin fill' : 'import'} · ${WRITE ? 'WRITE' : 'dry-run'} · target DB ${host(dbUrl)}`)

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

  if (FILL_ADMINS) {
    const { rows: directory } = await db.query<DirectoryAdmin>(
      `SELECT id, invite_key AS "inviteKey", admin_name AS "adminName", admin_contact AS "adminContact"
       FROM community_groups WHERE invite_key IS NOT NULL`)
    const fills = planAdminFill(groups, directory)
    const filled: string[] = []
    if (WRITE) {
      for (const f of fills) {
        const res = await db.query(
          `UPDATE community_groups
           SET admin_name = CASE WHEN coalesce(trim(admin_name), '') = '' THEN coalesce($2, admin_name) ELSE admin_name END,
               admin_contact = CASE WHEN coalesce(trim(admin_contact), '') = '' THEN coalesce($3, admin_contact) ELSE admin_contact END
           WHERE id = $1`,
          [f.id, f.adminName ?? null, f.adminContact ?? null])
        if (res.rowCount) filled.push(f.id)
      }
    }
    const withAdmin = groups.filter(g => g.adminName || g.adminContact).length
    const summary = {
      mode: WRITE ? 'write' : 'dry-run',
      sheetGroupsWithAdmin: withAdmin,
      toFill: fills.length,
      names: fills.filter(f => f.adminName).length,
      contacts: fills.filter(f => f.adminContact).length,
      filled: filled.length,
    }
    // Never the name or number itself — only which field gets filled.
    const rows = fills.map(f => ({ id: f.id, citySlug: f.citySlug, group: f.name, name: !!f.adminName, contact: !!f.adminContact }))
    if (JSON_OUT) console.log(JSON.stringify({ ...summary, fills: rows, filledIds: filled }, null, 2))
    else {
      console.log(`\nSheet: ${withAdmin} groups with an admin · ${WRITE ? 'filled' : 'would fill'} ${WRITE ? filled.length : fills.length} (names ${summary.names}, contacts ${summary.contacts})`)
      for (const r of rows) console.log(`  ~ ${r.citySlug.padEnd(22)} ${[r.name && 'name', r.contact && 'contact'].filter(Boolean).join(' + ').padEnd(14)} ${r.group}  (${r.id})`)
    }
  } else {
    const { rows: existing } = await db.query<{ key: string }>(`SELECT invite_key AS key FROM community_groups WHERE invite_key IS NOT NULL`)
    const plan = planGroupImport(groups, existing.map(r => r.key))

    let inserted = 0
    if (WRITE) {
      for (const g of plan.insert) {
        const r = groupImportRow(g)
        const res = await db.query(
          `INSERT INTO community_groups (city_slug, name, platform, invite_url, invite_key, styles, source, status, kind, verified, admin_name, admin_contact)
           VALUES ($1, $2, $3, $4, $5, $6::json, $7, $8, $9, $10, $11, $12)
           ON CONFLICT DO NOTHING`,
          [r.citySlug, r.name, r.platform, r.inviteUrl, r.inviteKey, JSON.stringify(r.styles), r.source, r.status, r.kind, r.verified, r.adminName, r.adminContact])
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

    if (JSON_OUT) console.log(JSON.stringify({ ...summary, insert: plan.insert.map(({ adminName, adminContact, ...g }) => ({ ...g, admin: !!(adminName || adminContact) })), skippedRows: skipped }, null, 2))
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
  }
} finally {
  await db.end()
}
