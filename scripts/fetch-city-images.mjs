/**
 * Precompute a landmark hero image per city from Wikimedia Commons.
 *
 * Reads distinct cities from the DB, looks up each city's Wikipedia lead image
 * (a representative landmark/skyline), captures the CC attribution, and writes
 * server/data/city-images.json. The /cities/[city] page reads this at SSR time
 * — no runtime external calls, so the page stays instant.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/fetch-city-images.mjs            # all cities
 *   DATABASE_URL=... node scripts/fetch-city-images.mjs --limit 12 # top N by size
 *   DATABASE_URL=... node scripts/fetch-city-images.mjs munich berlin  # specific slugs
 */
import { neon } from '@neondatabase/serverless'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'server', 'data', 'city-images.json')
const UA = 'wedance-city-images/1.0 (https://2026.wedance.vip; razbakov.aleksey@gmail.com)'
const API = 'https://en.wikipedia.org/w/api.php'

const args = process.argv.slice(2)
const limitFlag = args.indexOf('--limit')
const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : null
const onlySlugs = args.filter(a => !a.startsWith('--') && a !== String(limit))

// Disambiguation rescues: bare names that Wikipedia sends to a disambiguation
// page. Keyed by city_slug → the specific Wikipedia title to look up instead.
const ALIASES = {
  'new-york': 'New York City',
  'austin': 'Austin, Texas',
  'split': 'Split, Croatia',
  'palma': 'Palma de Mallorca',
  'faro': 'Faro, Portugal',
  'offenbach': 'Offenbach am Main',
  'oeiras': 'Oeiras, Portugal',
  'mons': 'Mons, Belgium',
  'esslingen': 'Esslingen am Neckar',
  'brunswick': 'Braunschweig',
  'oldenburg': 'Oldenburg (Oldb)',
  'lodi': 'Lodi, Lombardy',
  'malia': 'Malia, Crete',
  'san-jose': 'San Jose, California',
  'shibuya-city': 'Shibuya',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const strip = html => (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const WD = 'https://www.wikidata.org/w/api.php'
const countryCache = new Map() // country QID → English label (many cities share a country)
async function wd(params) {
  const url = `${WD}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`WD HTTP ${res.status}`)
  return res.json()
}

// Languages whose city labels/aliases are worth searching (WeDance's footprint).
const ALT_LANGS = 'en|de|es|fr|it|pt|pl|cs|nl|tr|ru|uk|hu|ro|hr|el|ca|sr|sk|sv|fi|da'

// Keep only useful alternate names: drop the English name itself, admin/codes
// (all-caps ≤5, digits), and disambiguated forms with commas/parens.
function cleanAltNames(raw, canonical) {
  const canon = canonical.trim().toLowerCase()
  const seen = new Set(), out = []
  for (const v of raw) {
    const s = (v || '').trim()
    const l = s.toLowerCase()
    if (!s || seen.has(l)) continue
    if (l === canon) continue
    if (/[,()]/.test(s) || /\d/.test(s)) continue          // "Köln (Deutschland)", "Cologne, Germany"
    if (s === s.toUpperCase() && s.length <= 5) continue     // codes: LHM, MUC
    if (l.includes(canon) && /\s/.test(s)) continue          // "City of Prague" — but keep "Milano"
    seen.add(l); out.push(s)
    if (out.length >= 6) break
  }
  return out
}

// One Wikidata entity call → CURRENT country (P17) + native/local names.
// A place can carry several P17 statements across history (e.g. Berlin →
// Margraviate of Brandenburg), so skip any with an end-date qualifier (P582)
// and prefer the 'preferred' rank — that's the present-day country.
async function entityInfo(qid, canonical) {
  if (!qid) return { country: null, altNames: [] }
  const e = await wd({ action: 'wbgetentities', ids: qid, props: 'claims|labels|aliases', languages: ALT_LANGS })
  const ent = e?.entities?.[qid] || {}

  const claims = ent.claims?.P17 || []
  const current = claims.filter(c => c?.mainsnak?.datavalue?.value?.id && !c?.qualifiers?.P582)
  const chosen = current.find(c => c.rank === 'preferred') || current[current.length - 1] || null
  const p17 = chosen?.mainsnak?.datavalue?.value?.id
  let country = null
  if (p17) {
    if (countryCache.has(p17)) country = countryCache.get(p17)
    else {
      const c = await wd({ action: 'wbgetentities', ids: p17, props: 'labels', languages: 'en' })
      country = c?.entities?.[p17]?.labels?.en?.value || null
      countryCache.set(p17, country)
    }
  }

  const raw = []
  raw.push(...(ent.claims?.P1705 || []).map(c => c?.mainsnak?.datavalue?.value?.text).filter(Boolean)) // native label
  for (const v of Object.values(ent.labels || {})) if (v?.value) raw.push(v.value)
  for (const arr of Object.values(ent.aliases || {})) for (const a of (arr || []).slice(0, 3)) if (a?.value) raw.push(a.value)
  return { country, altNames: cleanAltNames(raw, canonical) }
}

async function fetchCity(name) {
  // 1) lead image (sized thumb) + disambiguation flag + resolved title
  const q = await api({
    action: 'query', prop: 'pageimages|pageprops', piprop: 'thumbnail|name',
    pithumbsize: '1600', redirects: '1', titles: name,
  })
  const page = q?.query?.pages?.[0]
  if (!page || page.missing) return { status: 'missing' }
  if (page.pageprops && 'disambiguation' in page.pageprops) return { status: 'disambiguation' }
  const image = page.thumbnail?.source
  const file = page.pageimage
  if (!image || !file) return { status: 'no-image' }

  // 2) country + native/local names via Wikidata, from the page's linked entity
  let country = null, altNames = []
  try { ({ country, altNames } = await entityInfo(page.pageprops?.wikibase_item, page.title)) } catch { /* best-effort */ }

  // 3) attribution from the file's extmetadata
  let credit = null, license = null, licenseUrl = null
  try {
    const info = await api({
      action: 'query', prop: 'imageinfo', iiprop: 'extmetadata', titles: `File:${file}`,
    })
    const meta = info?.query?.pages?.[0]?.imageinfo?.[0]?.extmetadata || {}
    credit = strip(meta.Artist?.value) || null
    license = meta.LicenseShortName?.value || null
    licenseUrl = meta.LicenseUrl?.value || null
  } catch { /* attribution best-effort */ }

  return {
    status: 'ok',
    image,
    credit,
    license,
    licenseUrl,
    country,
    altNames,
    source: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    resolvedTitle: page.title,
  }
}

async function main() {
  const sql = neon(process.env.DATABASE_URL)
  let cities = await sql.query(
    `select city, city_slug from profiles
     where status='visible' and city is not null and city_slug is not null
     group by city, city_slug order by count(*) desc`,
  )
  if (onlySlugs.length) cities = cities.filter(c => onlySlugs.includes(c.city_slug))
  if (limit) cities = cities.slice(0, limit)

  const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
  let ok = 0, skipped = 0
  for (const { city, city_slug } of cities) {
    try {
      const r = await fetchCity(ALIASES[city_slug] || city)
      if (r.status === 'ok') {
        out[city_slug] = { image: r.image, credit: r.credit, license: r.license, licenseUrl: r.licenseUrl, country: r.country, altNames: r.altNames, source: r.source }
        ok++
        console.log(`✓ ${city_slug.padEnd(20)} ${r.resolvedTitle} — ${r.country || '?'} — alt: [${(r.altNames || []).join(', ')}]`)
      } else {
        skipped++
        console.log(`· ${city_slug.padEnd(20)} ${city} — ${r.status}`)
      }
    } catch (e) {
      skipped++
      console.log(`✗ ${city_slug.padEnd(20)} ${city} — ${e.message}`)
    }
    await sleep(120)
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(`\nDone: ${ok} images, ${skipped} skipped. Total in file: ${Object.keys(out).length}. → ${OUT}`)
}

main()
