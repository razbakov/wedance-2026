#!/usr/bin/env bun
/**
 * Seed La Timbería's launch workspace (Business → page → Launch) with the facts
 * and decisions Alex has written down — nothing invented. Source:
 * ~/Orgs/LaClave/CLAUDE.md ("Key facts", "Venue answers", "Name collision",
 * "Maps listing") and the 2026-11-12 strategy note
 * ~/Orgs/LaClave/01_Domains/Promotion_and_Community/Governance/Backlog/2026-11-12-reframe-corazon-cubano-presents.md
 *
 * Neither La Timbería nor Corazón Cubano had a WeDance page (checked 2026-11-13),
 * so this creates the page — hidden (status 'hidden') until Alex shows it — and
 * makes --owner-email its owner. Fields Alex hasn't decided stay empty (the
 * Instagram handle, the brand's own Instagram, the Maps category).
 *
 * Idempotent: the page is created once; step fields are only filled where empty;
 * names and evidence are only added when missing. Rows carry
 * profiles.source_ref = {source:'launch-seed'}.
 *
 * Rollback (cascades to launch_steps / launch_names / launch_evidence / members):
 *   DELETE FROM profiles WHERE source_ref->>'source' = 'launch-seed' AND username = 'latimberia';
 *
 * Usage (local DB by default; production needs --production AND Alex's OK):
 *   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql \
 *     bun scripts/seed-launch-la-timberia.ts --owner-email <email>            # dry-run
 *   … --write                                                                 # apply
 *   … --handle <handle>  --type organizer|venue                               # defaults: latimberia, organizer
 */
import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq } from 'drizzle-orm'
import * as schema from '../server/database/schema'

const { profiles, profileMembers, dancers, launchSteps, launchNames, launchEvidence } = schema
const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }
const WRITE = flag('write')
const HANDLE = opt('handle') ?? 'latimberia'
const TYPE = (opt('type') ?? 'organizer') as 'organizer' | 'venue'
const OWNER = opt('owner-email')

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
const host = new URL(dbUrl).hostname
const local = ['localhost', '127.0.0.1', '::1'].includes(host)
if (!local && WRITE && !flag('production')) {
  console.error(`Refusing to write to ${host}: that's not a local database. Pass --production only with Alex's OK.`)
  process.exit(1)
}
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT
const db = drizzle(neon(dbUrl), { schema })
console.error(`seed-launch-la-timberia · ${WRITE ? 'WRITE' : 'dry-run'} · ${host} · @${HANDLE}`)

const LACLAVE_MD = '~/Orgs/LaClave/CLAUDE.md'
const MAPS_LISTING = 'https://www.google.com/maps/place/La+Clave+-+Latin+Disco/@48.1386945,11.5642406,589m/data=!3m2!1e3!4b1!4m6!3m5!1s0x479e753829e45eb5:0xab724286f2855ee7!8m2!3d48.1386945!4d11.5668155!16s%2Fg%2F11_0824h4g'

// Only facts from the sources above.
const FIELDS: Record<string, Record<string, string>> = {
  'brand.why': {
    brandName: 'Corazón Cubano',
    brandWhy: 'The why: a community for people interested in Cuban culture. Thursdays are its weekly meeting — people come to dance, build, rehearse and perform.',
    brandWebsite: 'https://corazoncubano.de',
  },
  'brand.where': {
    placeName: 'La Timbería',
    displayName: 'La Timbería – Latin Disco',
    venueName: 'Luma',
    address: 'Neuhauser Str. 47, 80331 München',
    city: 'Munich',
    night: 'Every Thursday',
    hours: '19:00–00:00',
    price: 'Ladies free · free until 21:00 · 10€ from 21:00',
    music: 'Salsa · Bachata · Merengue',
    venueInstagram: '@evergreen_goes_luma',
  },
  'brand.pitch': {
    searchWords: 'Latin Disco, Salsa, Bachata',
    pitchShort: 'A weekly Latin night in Munich’s city centre: a free after-work warm-up from 19:00, the fiesta from 21:00.',
  },
  'name.pick': { nameArea: 'Munich' },
  'maps.name': { mapsUrl: MAPS_LISTING },
}

type Ev = { source: string; url: string; verdict: 'free' | 'taken' | 'unclear'; note: string }
const NAMES: { name: string; decision: 'candidate' | 'chosen' | 'dropped'; note: string; evidence: Ev[] }[] = [
  {
    name: 'La Clave – Latin Disco', decision: 'dropped',
    note: 'The first name (OK’d by Javier for Maps and Instagram). Dropped 2026-11-12 after the collision below.',
    evidence: [
      { source: 'MamboJazz Munich', url: 'https://mambojazz.de/event/la-clave-munich-in-%C2%A8on-stage%C2%A8/', verdict: 'taken', note: '“La Clave Munich”: a Mambo weekend 24–25 Oct 2026 at Salsa OnStage, by MamboJazz Munich. Found by Alex 2026-11-12; missed by the first AI check. Shows up when people search “La Clave - Latin Disco”.' },
      { source: 'Salsa OnStage', url: 'https://www.salsa-onstage.de/events/salsa-fiesta-la-clave/', verdict: 'taken', note: '“Salsa Fiesta La Clave” at Salsa OnStage. Looks one-off; not confirmed.' },
    ],
  },
  {
    name: 'La Timbería', decision: 'chosen',
    note: '“The place of timba”. Decided by Alex 2026-11-12.',
    evidence: [
      { source: 'Instagram', url: 'https://www.instagram.com/latimberia/', verdict: 'free', note: `Alex, 2026-11-12: @latimberia showed no profile. (${LACLAVE_MD})` },
      { source: 'Google', url: 'https://www.google.com/search?q=%22La%20Timber%C3%ADa%22%20M%C3%BCnchen', verdict: 'free', note: `Alex, 2026-11-12: checked free in Munich/Germany on Google. (${LACLAVE_MD})` },
      { source: 'Google Maps', url: 'https://www.google.com/maps/search/La%20Timber%C3%ADa%20M%C3%BCnchen', verdict: 'free', note: `Alex, 2026-11-12: checked free on Maps. (${LACLAVE_MD})` },
    ],
  },
]

// Step evidence (not tied to a name).
const STEP_EVIDENCE: Record<string, { source: string; url: string; note: string }[]> = {
  'maps.name': [{ source: 'Google Maps', url: MAPS_LISTING, note: 'Alex’s listing is live as “La Clave - Latin Disco” (renamed from “Cuban Meets Dominican”). Not yet renamed to La Timbería.' }],
}
const STATUS: Record<string, 'doing' | 'done'> = { 'brand.why': 'doing', 'brand.where': 'doing', 'brand.pitch': 'doing', 'name.pick': 'done', 'maps.name': 'doing' }

const plan: string[] = []
const act = async (what: string, fn: () => Promise<unknown>) => { plan.push(what); if (WRITE) await fn() }

let [p] = await db.select().from(profiles).where(eq(profiles.username, HANDLE))
if (!p) {
  await act(`create hidden ${TYPE} page @${HANDLE} “La Timbería”`, async () => {
    ;[p] = await db.insert(profiles).values({
      username: HANDLE, type: TYPE, name: 'La Timbería', city: 'Munich', citySlug: 'munich', claimed: true, status: 'hidden',
      address: TYPE === 'venue' ? 'Neuhauser Str. 47, 80331 München' : null,
      socials: [{ platform: 'website', url: 'https://corazoncubano.de' }],
      sourceRef: { source: 'launch-seed', at: new Date().toISOString() },
    } as any).returning()
  })
} else console.error(`@${HANDLE} exists (${p.name}) — filling its workspace only`)

if (OWNER) {
  const [d] = await db.select({ id: dancers.id }).from(dancers).where(eq(dancers.email, OWNER.toLowerCase()))
  if (!d) console.error(`No dancer with that email here — no owner added.`)
  else if (!p || !(await db.select().from(profileMembers).where(and(eq(profileMembers.profileId, p.id), eq(profileMembers.dancerId, d.id)))).length)
    await act('make the --owner-email dancer an owner', () => db.insert(profileMembers).values({ profileId: p!.id, dancerId: d.id, role: 'owner' }))
} else console.error('No --owner-email: nobody but admins will see the workspace.')

const pid = () => p!.id
for (const [key, fields] of Object.entries(FIELDS)) {
  const [cur] = p ? await db.select().from(launchSteps).where(and(eq(launchSteps.profileId, p.id), eq(launchSteps.stepKey, key))) : []
  const merged = { ...fields, ...(cur?.fields ?? {}) } // never overwrite what's there
  const status = cur?.status && cur.status !== 'todo' ? cur.status : STATUS[key] ?? 'doing'
  await act(`${cur ? 'fill empty fields of' : 'start'} step ${key} (${Object.keys(fields).length} fields, ${status})`, async () => {
    if (cur) await db.update(launchSteps).set({ fields: merged, status, updatedAt: new Date() }).where(eq(launchSteps.id, cur.id))
    else await db.insert(launchSteps).values({ profileId: pid(), stepKey: key, fields: merged, status, doneAt: status === 'done' ? new Date() : null })
  })
}
for (const [key, status] of Object.entries(STATUS)) if (!FIELDS[key]) {
  await act(`set step ${key} → ${status}`, () => db.insert(launchSteps).values({ profileId: pid(), stepKey: key, status }).onConflictDoNothing())
}

for (const n of NAMES) {
  const [cur] = p ? await db.select().from(launchNames).where(and(eq(launchNames.profileId, p.id), eq(launchNames.name, n.name))) : []
  if (cur) { console.error(`name “${n.name}” exists — left as is`); continue }
  await act(`name “${n.name}” (${n.decision}) with ${n.evidence.length} evidence`, async () => {
    const [row] = await db.insert(launchNames).values({ profileId: pid(), name: n.name, decision: n.decision, note: n.note }).returning()
    await db.insert(launchEvidence).values(n.evidence.map(e => ({ profileId: pid(), stepKey: 'name.pick', nameId: row!.id, ...e })))
  })
}
for (const [key, list] of Object.entries(STEP_EVIDENCE)) for (const e of list) {
  const [cur] = p ? await db.select({ id: launchEvidence.id }).from(launchEvidence).where(and(eq(launchEvidence.profileId, p.id), eq(launchEvidence.stepKey, key), eq(launchEvidence.url, e.url))) : []
  if (!cur) await act(`evidence on ${key}: ${e.source}`, () => db.insert(launchEvidence).values({ profileId: pid(), stepKey: key, ...e }))
}

console.log(plan.map(l => `${WRITE ? '✓' : '·'} ${l}`).join('\n') || 'Nothing to do.')
if (!WRITE) console.log('\nDry-run. Add --write to apply.')
