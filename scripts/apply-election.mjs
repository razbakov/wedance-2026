// One-off: apply migration 0016 (additive) + seed a live demo election on the
// Pinakothek Open-Air commons so the moderator-election flow can be tested end
// to end. Idempotent-ish: skips DDL that already exists and won't double-seed.
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL missing'); process.exit(1) }
const sql = neon(url)

// --- 1) Apply the migration DDL statement-by-statement ----------------------
const ddl = readFileSync(new URL('../server/database/migrations/0016_material_slyde.sql', import.meta.url), 'utf8')
const statements = ddl.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
let applied = 0, skipped = 0
for (const stmt of statements) {
  try { await sql.query(stmt); applied++ }
  catch (e) {
    const m = String(e.message || e)
    if (/already exists|duplicate/i.test(m)) { skipped++ }
    else { console.error('DDL failed:', m, '\n---\n', stmt.slice(0, 120)); process.exit(1) }
  }
}
console.log(`DDL: ${applied} applied, ${skipped} already present`)

// --- 2) Make Alex an admin (so steward controls are testable) ---------------
const adm = await sql.query(`UPDATE dancers SET is_admin = true WHERE email = 'razbakov.aleksey@gmail.com' RETURNING id, username`)
console.log('admin:', adm.length ? `set for ${adm[0].username || adm[0].id}` : 'Alex not found in dancers yet (sign in once, then re-run to grant)')

// --- 3) Find the Pinakothek Open-Air profile --------------------------------
const [profile] = await sql.query(`SELECT id, name FROM profiles WHERE username = 'pinakothek-der-moderne' LIMIT 1`)
if (!profile) { console.error('Pinakothek profile not found — run db:seed first'); process.exit(1) }

// Skip if an election already exists for it.
const existing = await sql.query(`SELECT id, status FROM moderator_elections WHERE profile_id = $1`, [profile.id])
if (existing.length) {
  console.log(`Election already exists (${existing[0].status}) → /elections/pinakothek-der-moderne`)
  process.exit(0)
}

// --- 4) Two demo candidate dancers ------------------------------------------
async function ensureDancer(email, name, username) {
  await sql.query(
    `INSERT INTO dancers (email, name, username) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING`,
    [email, name, username],
  )
  const [d] = await sql.query(`SELECT id FROM dancers WHERE email = $1`, [email])
  return d.id
}
const rosa = await ensureDancer('rosa.demo@wedance.vip', 'Rosa (demo)', 'rosa-demo')
const diego = await ensureDancer('diego.demo@wedance.vip', 'Diego (demo)', 'diego-demo')

// --- 5) The election, in VOTING phase ---------------------------------------
const [election] = await sql.query(
  `INSERT INTO moderator_elections (profile_id, status, term_start, term_end, voting_open_at)
   VALUES ($1, 'voting', '2026-01-01', '2027-01-01', now()) RETURNING id`,
  [profile.id],
)
const [cRosa] = await sql.query(
  `INSERT INTO election_candidates (election_id, dancer_id, guidelines, statement)
   VALUES ($1,$2,$3,$4) RETURNING id`,
  [election.id, rosa, 'Open to all levels and styles. No reserved slots before 18:00 — first come, shared floor. Keep the volume neighbour-friendly after 22:00. Beginners always welcome up front.', 'Keep it open, shared, and welcoming.'],
)
const [cDiego] = await sql.query(
  `INSERT INTO election_candidates (election_id, dancer_id, guidelines, statement)
   VALUES ($1,$2,$3,$4) RETURNING id`,
  [election.id, diego, 'A lightweight weekly schedule: themed nights (salsa Tue, bachata Thu), the rest kept free-play. Organisers can book an area a week ahead via the queue; walk-ups fill the gaps.', 'A little structure so nobody wonders what is on.'],
)

// --- 6) Seed a couple of votes so the ledger is alive ------------------------
async function seedVote(voter, candidate) {
  await sql.query(
    `INSERT INTO election_votes (election_id, voter_dancer_id, candidate_id) VALUES ($1,$2,$3)
     ON CONFLICT (election_id, voter_dancer_id) DO NOTHING`,
    [election.id, voter, candidate],
  )
  await sql.query(
    `INSERT INTO election_vote_history (election_id, voter_dancer_id, from_candidate_id, to_candidate_id) VALUES ($1,$2,NULL,$3)`,
    [election.id, voter, candidate],
  )
}
await seedVote(rosa, cRosa.id)   // candidates vote for themselves
await seedVote(diego, cDiego.id)

console.log(`\nSeeded VOTING election for ${profile.name}`)
console.log(`  candidates: Rosa (${cRosa.id.slice(0,8)}) · Diego (${cDiego.id.slice(0,8)})`)
console.log(`  → https://2026.wedance.vip/elections/pinakothek-der-moderne`)
