// DRY-RUN analysis only. Reads v4 + 2026, writes NOTHING. Reports the transform plan.
import { neon } from '@neondatabase/serverless'
const v4 = neon(process.env.DIRECT_URL_V4), tgt = neon(process.env.DATABASE_URL)
const rows = async (sql, text) => (await sql.query(text)).rows ?? (await sql.query(text))
const n = async (sql, text) => (await rows(sql, text))[0]?.n

const R = {}
// --- Users ---
R.users = {
  active: await n(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false`),
  with_password: await n(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false AND "hash" <> ''`),
  no_password_magiclink_only: await n(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false AND "hash" = ''`),
  email_verified: await n(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false AND "emailVerified"=true`),
  email_consent: await n(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false AND "emailConsent"=true`),
}
// conflicts with existing target dancers (by email)
const tgtEmails = (await rows(tgt, `SELECT lower(email) e FROM dancers`)).map(r=>r.e)
const dupCheck = await n(v4, `SELECT count(*)::int n FROM "User" u WHERE u."isDeleted"=false AND lower(u.email) IN (${tgtEmails.length? tgtEmails.map(e=>`'${e.replace(/'/g,"''")}'`).join(','):"''"})`)
R.users.already_in_target_will_update = dupCheck
// duplicate emails within source
R.users.dup_emails_in_source = await n(v4, `SELECT count(*)::int n FROM (SELECT lower(email) e FROM "User" WHERE "isDeleted"=false GROUP BY lower(email) HAVING count(*)>1) x`)

// --- Profiles ---
R.profiles_by_type_active = await rows(v4, `SELECT type, count(*)::int n FROM "Profile" WHERE "isDeleted"=false GROUP BY type ORDER BY n DESC`)
R.profiles = {
  with_username: await n(v4, `SELECT count(*)::int n FROM "Profile" WHERE "isDeleted"=false AND "username" <> ''`),
  with_coords: await n(v4, `SELECT count(*)::int n FROM "Profile" WHERE "isDeleted"=false AND lat IS NOT NULL`),
  claimed: await n(v4, `SELECT count(*)::int n FROM "Profile" WHERE "isDeleted"=false AND claimed=true`),
  dup_usernames: await n(v4, `SELECT count(*)::int n FROM (SELECT lower(username) u FROM "Profile" WHERE "isDeleted"=false AND username<>'' GROUP BY lower(username) HAVING count(*)>1) x`),
}
// --- Events ---
R.events = {
  published: await n(v4, `SELECT count(*)::int n FROM "Event" WHERE published=true`),
  multiday_festival: await n(v4, `SELECT count(*)::int n FROM "Event" WHERE published=true AND "endDate" IS NOT NULL AND "startDate" IS NOT NULL AND "endDate"::date > "startDate"::date`),
  single_day_event: await n(v4, `SELECT count(*)::int n FROM "Event" WHERE published=true AND NOT ("endDate" IS NOT NULL AND "startDate" IS NOT NULL AND "endDate"::date > "startDate"::date)`),
  with_slug: await n(v4, `SELECT count(*)::int n FROM "Event" WHERE published=true AND slug IS NOT NULL AND slug<>''`),
  future: await n(v4, `SELECT count(*)::int n FROM "Event" WHERE published=true AND "startDate" >= now()`),
}
// --- Reference ---
R.reference = {
  cities: await n(v4, `SELECT count(*)::int n FROM "City"`),
  countries: await n(v4, `SELECT count(*)::int n FROM "Country"`),
  dance_styles: await n(v4, `SELECT count(*)::int n FROM "DanceStyle"`),
  dance_styles_distinct_name: await n(v4, `SELECT count(*)::int n FROM (SELECT DISTINCT lower(name) FROM "DanceStyle") x`),
}
console.log(JSON.stringify(R, null, 2))
