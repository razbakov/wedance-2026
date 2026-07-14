import { neon } from '@neondatabase/serverless'
const v4 = neon(process.env.DIRECT_URL_V4), tgt = neon(process.env.DATABASE_URL)
const DRY = process.argv.includes('--dry-run')
const arr = (r) => r.rows ?? r

// Read active users + their owned Dancer profile (for name/photo/bio/socials/city).
const users = arr(await v4.query(`
  SELECT u.id uid, lower(u.email) email, u.name, u."firstName" fn, u."lastName" ln,
         u.salt, u.hash, u."firebaseId" fbid,
         p.id pid, p.username, p.name pname, p.photo, p.bio, p.instagram, p.youtube, p.website,
         c.name city
  FROM "User" u
  LEFT JOIN "Profile" p ON p."userId" = u.id AND p."isDeleted" = false
  LEFT JOIN "City" c ON c.id = p."cityId"
  WHERE u."isDeleted" = false
`))
// de-dup by email (2 dup emails in source) — keep the one with a password, else first
const byEmail = new Map()
for (const u of users) {
  const cur = byEmail.get(u.email)
  if (!cur || (!cur.hash && u.hash)) byEmail.set(u.email, u)
}
const rowsIn = [...byEmail.values()]
const name = (u) => (u.name?.trim()) || [u.fn, u.ln].filter(Boolean).join(' ').trim() || u.pname?.trim() || u.email.split('@')[0]

let inserted = 0, updated = 0
const CH = 500
for (let i = 0; i < rowsIn.length; i += CH) {
  const b = rowsIn.slice(i, i + CH)
  const cols = { email: [], name: [], salt: [], hash: [], photo: [], bio: [], ig: [], yt: [], web: [], city: [], sref: [] }
  for (const u of b) {
    cols.email.push(u.email); cols.name.push(name(u)); cols.salt.push(u.salt || ''); cols.hash.push(u.hash || '')
    cols.photo.push(u.photo || null); cols.bio.push(u.bio || null); cols.ig.push(u.instagram || null)
    cols.yt.push(u.youtube || null); cols.web.push(u.website || null); cols.city.push(u.city || null)
    cols.sref.push(JSON.stringify({ v4UserId: u.uid, v4ProfileId: u.pid || null, firebaseId: u.fbid || null }))
  }
  if (DRY) { inserted += b.length; continue }
  const q = `
    INSERT INTO dancers (email, name, salt, hash, photo, bio, instagram, youtube, website, city, source_ref)
    SELECT * FROM unnest($1::text[],$2::text[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[],$8::text[],$9::text[],$10::text[],$11::jsonb[])
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      photo = COALESCE(EXCLUDED.photo, dancers.photo),
      bio = COALESCE(EXCLUDED.bio, dancers.bio),
      instagram = COALESCE(EXCLUDED.instagram, dancers.instagram),
      youtube = COALESCE(EXCLUDED.youtube, dancers.youtube),
      website = COALESCE(EXCLUDED.website, dancers.website),
      city = COALESCE(EXCLUDED.city, dancers.city),
      salt = CASE WHEN COALESCE(dancers.hash,'')='' THEN EXCLUDED.salt ELSE dancers.salt END,
      hash = CASE WHEN COALESCE(dancers.hash,'')='' THEN EXCLUDED.hash ELSE dancers.hash END,
      source_ref = EXCLUDED.source_ref
    RETURNING (xmax = 0) AS is_insert`
  const res = arr(await tgt.query(q, [cols.email, cols.name, cols.salt, cols.hash, cols.photo, cols.bio, cols.ig, cols.yt, cols.web, cols.city, cols.sref]))
  for (const r of res) (r.is_insert ? inserted++ : updated++)
  process.stderr.write(`  …${Math.min(i+CH, rowsIn.length)}/${rowsIn.length}\n`)
}
const total = arr(await tgt.query(`SELECT count(*)::int n FROM dancers`))[0].n
const migrated = arr(await tgt.query(`SELECT count(*)::int n FROM dancers WHERE source_ref IS NOT NULL`))[0].n
const withpw = arr(await tgt.query(`SELECT count(*)::int n FROM dancers WHERE source_ref IS NOT NULL AND COALESCE(hash,'')<>''`))[0].n
console.log(JSON.stringify({ mode: DRY?'DRY':'WRITE', source_rows: rowsIn.length, inserted, updated, target_total: total, migrated_tagged: migrated, with_password: withpw }, null, 2))
