/**
 * The organisers' group list (Google Sheet "Outreach CRM" → tab "Groups") → community_groups
 * rows (RAZ-861). Pure: CSV parsing, sheet row → group, and the insert plan; the script
 * `scripts/import-community-groups.ts` does the reading and writing.
 *
 * Rules: the link is the sheet's "Whatsapp" column (it also holds t.me links — the platform
 * comes from the link, not the "Type" column); a row the sheet marks private, invalid or
 * inactive is left out; the city must be a city WeDance knows (first one when a row lists
 * several), otherwise the row is reported, never guessed; the same group (invite_key) is
 * imported once and never when the directory has it already, whatever its status.
 */
import { inviteKey, platformOf, type GroupPlatform } from '../../shared/utils/communityGroups'
import { normName, STYLE_MAP, type CityIndex } from './v3EventSync'

export const GROUP_IMPORT_SOURCE = 'import'

export type ImportGroup = {
  line: number
  citySlug: string
  cityName: string
  name: string
  platform: GroupPlatform
  inviteUrl: string
  inviteKey: string
  styles: string[]
}

export type GroupSkipReason = 'no_link' | 'not_an_invite' | 'no_name' | 'private' | 'marked_dead' | 'no_city' | 'unknown_city'
export type GroupSkipped = { line: number; name: string; city: string; reason: GroupSkipReason }

/** RFC 4180 CSV: quoted fields may hold commas, "" and line breaks (the sheet's notes do). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** Sheet style text → the labels the city page shows ("SBK" → Salsa, Bachata, Kizomba). */
export function mapGroupStyles(raw: string): string[] {
  const out: string[] = []
  const add = (s: string) => { if (s && !out.includes(s)) out.push(s) }
  for (const part of raw.replace(/\(.*?\)/g, '').split(/[,/&|]|\band\b/i)) {
    const label = part.trim()
    if (!label) continue
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (key === 'sbk' || key === 'sabaki') { add('Salsa'); add('Bachata'); add('Kizomba'); continue }
    if (key === 'afrocuban') { add('Afro'); continue }
    add(STYLE_MAP[key] ?? label.charAt(0).toUpperCase() + label.slice(1))
  }
  return out.slice(0, 10)
}

/** Adds the `cities` table (name, local name, alt names) to an index, without overriding it. */
export function addCitiesToIndex(idx: CityIndex, rows: { slug: string; name: string; localName?: string | null; altNames?: string[] | null }[]) {
  for (const r of rows) {
    for (const n of [r.name, r.localName, r.slug.replace(/-/g, ' '), ...(r.altNames ?? [])]) {
      const k = n ? normName(n) : ''
      if (k && !idx.has(k)) idx.set(k, { slug: r.slug, name: r.name })
    }
  }
  return idx
}

/**
 * A sheet city → a known city, or null. Only cities WeDance knows: "Munich", "München",
 * "Lissabon"; the first of a list ("Wiesbaden, Mainz"); a unique longer name
 * ("Freiburg" → Freiburg im Breisgau). Regions ("Rhein-Main", "Whole Germany") stay null.
 */
export function matchGroupCity(raw: string, idx: CityIndex): { slug: string; name: string } | null {
  const first = normName(raw.split(/[,/;]| und | and /i)[0] ?? '')
  if (!first) return null
  const hit = idx.get(first)
  if (hit) return hit
  const words = first.split(' ')
  if (words.length > 1 && words[0]!.length > 3 && idx.get(words[0]!)) return idx.get(words[0]!)!
  const longer = new Map<string, { slug: string; name: string }>()
  for (const [k, v] of idx) if (k.startsWith(`${first} `)) longer.set(v.slug, v)
  return longer.size === 1 ? [...longer.values()][0]! : null
}

const col = (headers: string[], name: string) => headers.findIndex(h => h.trim().toLowerCase() === name)

/** The "Groups" tab → groups to import + the rows left out and why. */
export function mapGroupSheet(rows: string[][], idx: CityIndex): { groups: ImportGroup[]; skipped: GroupSkipped[] } {
  const [header, ...body] = rows
  if (!header) return { groups: [], skipped: [] }
  const h = header.map(x => x.trim().toLowerCase())
  const at = { city: col(h, 'city'), styles: col(h, 'dance styles'), name: col(h, 'name'), link: col(h, 'whatsapp'), note: col(h, 'note') }
  const types = h.flatMap((x, i) => (x === 'type' ? [i] : []))
  if ([at.city, at.name, at.link].some(i => i < 0)) throw new Error('The sheet needs City, Name and Whatsapp columns')

  const groups: ImportGroup[] = []
  const skipped: GroupSkipped[] = []
  body.forEach((r, i) => {
    const line = i + 2
    const get = (j: number) => (j >= 0 ? (r[j] ?? '').trim() : '')
    const name = get(at.name).replace(/[\s:]+$/, '').slice(0, 120)
    const city = get(at.city)
    const url = get(at.link)
    if (!name && !url) return // an empty line
    const skip = (reason: GroupSkipReason) => skipped.push({ line, name, city, reason })
    if (!url) return skip('no_link')
    const platform = platformOf(url)
    const key = inviteKey(url)
    if (!platform || !key || platform === 'other' || (platform === 'whatsapp' && !key.split('/')[1])) return skip('not_an_invite')
    if (name.length < 2) return skip('no_name')
    if (types.some(j => get(j).toLowerCase() === 'private')) return skip('private')
    if (/^(invalid|inactive|dead)\b/i.test(get(at.note))) return skip('marked_dead')
    if (!city) return skip('no_city')
    const hit = matchGroupCity(city, idx)
    if (!hit) return skip('unknown_city')
    groups.push({ line, citySlug: hit.slug, cityName: hit.name, name, platform, inviteUrl: url, inviteKey: key, styles: mapGroupStyles(get(at.styles)) })
  })
  return { groups, skipped }
}

/** What to insert: the first row per invite_key, and none the directory has already. */
export function planGroupImport(groups: ImportGroup[], existingKeys: Iterable<string>) {
  const known = new Set(existingKeys)
  const seen = new Set<string>()
  const insert: ImportGroup[] = []
  const inDirectory: ImportGroup[] = []
  const repeated: ImportGroup[] = []
  for (const g of groups) {
    if (known.has(g.inviteKey)) inDirectory.push(g)
    else if (seen.has(g.inviteKey)) repeated.push(g)
    else { seen.add(g.inviteKey); insert.push(g) }
  }
  return { insert, inDirectory, repeated }
}

/** The community_groups row for an imported group (insert-only; status visible, unverified). */
export function groupImportRow(g: ImportGroup) {
  return {
    citySlug: g.citySlug, name: g.name, platform: g.platform, inviteUrl: g.inviteUrl, inviteKey: g.inviteKey,
    styles: g.styles, source: GROUP_IMPORT_SOURCE, status: 'visible' as const, kind: 'community' as const, verified: false,
  }
}
