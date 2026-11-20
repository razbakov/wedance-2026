/**
 * Writes server/data/v3-nfc-cards.json: printed WeDance NFC cards (v3 `cards`
 * collection) → the v3 handle each is linked to, so /nfc/<card> keeps opening
 * the owner's page after the move to 2026 (server/middleware/v3-redirect.ts).
 * Read-only against v3 (one Firestore :runQuery). Only linked cards are kept;
 * handles are public profile URLs.
 *
 *   bun scripts/export-v3-nfc-cards.ts            # prints the map
 *   bun scripts/export-v3-nfc-cards.ts --write    # writes the JSON file
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { accessToken, decodeValue, type ServiceAccount } from '../server/utils/v3EventSync'

function serviceAccount(): ServiceAccount {
  if (process.env.WEDANCE_V3_SERVICE_ACCOUNT) return JSON.parse(process.env.WEDANCE_V3_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(process.env.WEDANCE_V3_SERVICE_ACCOUNT_FILE ?? join(homedir(), 'Secrets', 'wedance.json'), 'utf8'))
}

const sa = serviceAccount()
const token = await accessToken(sa)
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'cards' }], select: { fields: [{ fieldPath: 'username' }, { fieldPath: 'uid' }] } } }),
})
if (!res.ok) throw new Error(`Firestore runQuery failed: ${res.status} ${await res.text()}`)
const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, any> } }[]
// uid = the owner's v3 account id (public in v3 profile URLs) = 2026 dancers.source_ref.firebaseId,
// so a card still finds its owner after they pick a different 2026 handle.
const map: Record<string, { username: string; uid: string | null }> = {}
for (const r of rows) {
  if (!r.document) continue
  const username = decodeValue(r.document.fields?.username)
  const uid = decodeValue(r.document.fields?.uid)
  if (typeof username === 'string' && username.trim()) {
    map[r.document.name.split('/').pop()!] = { username: username.trim(), uid: typeof uid === 'string' && uid ? uid : null }
  }
}
const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
console.log(`${rows.filter(r => r.document).length} cards, ${Object.keys(sorted).length} linked`)
if (process.argv.includes('--write')) {
  writeFileSync(join(import.meta.dir, '../server/data/v3-nfc-cards.json'), `${JSON.stringify(sorted, null, 2)}\n`)
  console.log('wrote server/data/v3-nfc-cards.json')
} else console.log(sorted)
