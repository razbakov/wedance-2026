#!/usr/bin/env bun
/**
 * Import community groups from CSV into the database.
 *
 * CSV format (header required):
 * citySlug,name,platform,inviteUrl,styles,source,verified
 *
 * Example:
 * munich,Salsa Community Munich,whatsapp,https://chat.whatsapp.com/abc123,salsa|bachata,local-organizer,true
 * berlin,Kizomba Wednesday,telegram,https://t.me/joinchat/xyz789,kizomba,friend-referral,false
 *
 * Usage (requires file path):
 *   bun scripts/import-community-groups.ts data/community-groups.csv
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import { communityGroups } from '../server/database/schema'
import { parseCSVLine } from './csv-parser'

// Get the database URL from .env
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL environment variable not set')
  process.exit(1)
}

const db = drizzle(dbUrl)

// Require file path argument
const filePath = Bun.argv[2]
if (!filePath) {
  console.error('Usage: bun scripts/import-community-groups.ts <csv-file>')
  process.exit(1)
}

let csvContent: string
try {
  csvContent = await Bun.file(filePath).text()
} catch (error) {
  console.error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

if (!csvContent.trim()) {
  console.error('CSV file is empty')
  process.exit(1)
}


// Parse CSV
const lines = csvContent.trim().split('\n')
if (lines.length < 2) {
  console.error('CSV must have at least a header row')
  process.exit(1)
}

const headerLine = lines[0]
const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase())

// Validate required headers
const requiredHeaders = ['cityslug', 'name', 'platform', 'inviteurl']
const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
if (missingHeaders.length > 0) {
  console.error(`Missing required headers: ${missingHeaders.join(', ')}`)
  process.exit(1)
}

const citySlugIdx = headers.indexOf('cityslug')
const nameIdx = headers.indexOf('name')
const platformIdx = headers.indexOf('platform')
const inviteUrlIdx = headers.indexOf('inviteurl')
const stylesIdx = headers.indexOf('styles')
const sourceIdx = headers.indexOf('source')
const verifiedIdx = headers.indexOf('verified')

// Validate platform enum
const validPlatforms = ['whatsapp', 'telegram', 'facebook', 'other']

// Track imported groups to detect duplicates
const importedKeys = new Set<string>()

// Import rows
let imported = 0
let skipped = 0
let duplicates = 0

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  const parts = parseCSVLine(line)

  // Validate row has enough fields
  if (parts.length < Math.max(citySlugIdx, nameIdx, platformIdx, inviteUrlIdx) + 1) {
    console.warn(`Row ${i + 1}: not enough fields (expected at least ${Math.max(citySlugIdx, nameIdx, platformIdx, inviteUrlIdx) + 1}, got ${parts.length}), skipping`)
    skipped++
    continue
  }

  const citySlug = parts[citySlugIdx]
  const name = parts[nameIdx]
  const platform = parts[platformIdx]
  const inviteUrl = parts[inviteUrlIdx]
  const stylesStr = stylesIdx >= 0 ? parts[stylesIdx] : ''
  const source = sourceIdx >= 0 ? parts[sourceIdx] : undefined
  const verifiedStr = verifiedIdx >= 0 ? parts[verifiedIdx] : 'false'

  // Validate required fields
  if (!citySlug || !name || !platform || !inviteUrl) {
    console.warn(`Row ${i + 1}: missing required fields, skipping`)
    skipped++
    continue
  }

  if (!validPlatforms.includes(platform.toLowerCase())) {
    console.warn(
      `Row ${i + 1}: invalid platform "${platform}" (valid: ${validPlatforms.join(', ')}), skipping`,
    )
    skipped++
    continue
  }

  // Validate URL and ensure it's http(s) — reject javascript: and data: URLs
  let urlObj: URL
  try {
    urlObj = new URL(inviteUrl)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error(`unsafe protocol: ${urlObj.protocol}`)
    }
  } catch (error) {
    console.warn(`Row ${i + 1}: invalid invite URL "${inviteUrl}" — ${error instanceof Error ? error.message : 'invalid'}, skipping`)
    skipped++
    continue
  }

  // Deduplicate: check if we've already imported this in this batch
  const dedupeKey = `${citySlug}|${name.toLowerCase()}|${platform.toLowerCase()}`
  if (importedKeys.has(dedupeKey)) {
    console.warn(`Row ${i + 1}: duplicate (already imported ${name} in ${citySlug}), skipping`)
    duplicates++
    skipped++
    continue
  }

  // Parse styles (pipe-separated)
  const styles = stylesStr
    ? stylesStr.split('|').map((s) => s.trim()).filter(Boolean)
    : []

  // Parse verified (true/false/yes/no case-insensitive)
  const verified = ['true', 'yes', '1'].includes(verifiedStr.toLowerCase())

  try {
    // Check database for existing group (same city + name + platform)
    const existing = await db
      .select({ id: communityGroups.id })
      .from(communityGroups)
      .where(and(
        eq(communityGroups.citySlug, citySlug),
        eq(communityGroups.name, name),
        eq(communityGroups.platform, platform.toLowerCase() as any),
      ))

    if (existing.length > 0) {
      console.warn(`Row ${i + 1}: group already exists in database (${name} in ${citySlug}), skipping`)
      duplicates++
      skipped++
      continue
    }

    await db.insert(communityGroups).values({
      citySlug,
      name,
      platform: platform.toLowerCase() as 'whatsapp' | 'telegram' | 'facebook' | 'other',
      inviteUrl,
      styles,
      source: source || null,
      verified,
      status: 'visible',
    })

    importedKeys.add(dedupeKey)
    imported++
    console.log(`✓ Imported: ${name} (${platform}) in ${citySlug}`)
  } catch (error) {
    console.error(`Row ${i + 1}: failed to import — ${error instanceof Error ? error.message : String(error)}`)
    skipped++
  }
}

console.log(`\nImport complete: ${imported} imported, ${duplicates} duplicates, ${skipped - duplicates} errors`)
process.exit(skipped > 0 ? 1 : 0)
