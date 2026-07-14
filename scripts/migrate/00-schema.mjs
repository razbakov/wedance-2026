// Idempotent schema prereqs on the TARGET (prod 2026). Safe to re-run.
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
// source_ref for reversibility + idempotency (rollback = DELETE WHERE source_ref IS NOT NULL)
await sql.query(`ALTER TABLE dancers  ADD COLUMN IF NOT EXISTS source_ref jsonb`)
await sql.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source_ref jsonb`)
// events: home for imported v4 events. archived=true means hidden from live feeds.
await sql.query(`CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text,
  name text,
  type text,
  description text DEFAULT '',
  cover text DEFAULT '',
  start_date timestamp,
  end_date timestamp,
  is_festival boolean DEFAULT false,
  ticket_url text,
  price text DEFAULT '',
  city text,
  venue_username text,
  organizer_username text,
  styles jsonb DEFAULT '[]',
  archived boolean NOT NULL DEFAULT true,
  published boolean NOT NULL DEFAULT false,
  source_ref jsonb,
  created_at timestamp DEFAULT now()
)`)
await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS events_slug_uidx ON events(slug) WHERE slug IS NOT NULL`)
await sql.query(`CREATE INDEX IF NOT EXISTS events_archived_idx ON events(archived)`)
// follows: decision #4 — build the follow graph now.
await sql.query(`CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES dancers(id),
  target_username text NOT NULL,
  source_ref jsonb,
  created_at timestamp DEFAULT now(),
  UNIQUE(follower_id, target_username)
)`)
// verify
const t = async (name) => { const r = await sql.query(`SELECT count(*)::int n FROM ${name}`); return (r.rows ?? r)[0].n }
console.log(JSON.stringify({
  dancers: await t('dancers'), profiles: await t('profiles'),
  events: await t('events'), follows: await t('follows'),
  ok: 'schema prereqs applied'
}, null, 2))
