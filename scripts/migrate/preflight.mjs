import { neon } from '@neondatabase/serverless'
const V4 = process.env.DIRECT_URL_V4, T = process.env.DATABASE_URL
if (!V4 || !T) { console.log('MISSING ENV'); process.exit(1) }
const v4 = neon(V4), tgt = neon(T)
const one = async (sql, text) => { try { return (await sql.query(text)).rows?.[0]?.n ?? (await sql.query(text))[0]?.n } catch(e){ return 'ERR '+e.message.slice(0,45) } }
const rows = async (sql, text) => { try { const r = await sql.query(text); return r.rows ?? r } catch(e){ return 'ERR '+e.message.slice(0,45) } }
const out = { source_v4: {}, target_2026: {} }
for (const t of ['User','Profile','Event','City','Country','DanceStyle','Video','ProfileFollower'])
  out.source_v4[t] = await one(v4, `SELECT count(*)::int n FROM "${t}"`)
out.source_v4.User_active = await one(v4, `SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false`)
out.source_v4.User_with_hash = await one(v4, `SELECT count(*)::int n FROM "User" WHERE "hash" <> '' AND "isDeleted"=false`)
out.source_v4.Profile_by_type = await rows(v4, `SELECT type, count(*)::int n FROM "Profile" WHERE "isDeleted"=false GROUP BY type ORDER BY n DESC`)
out.source_v4.Event_published = await one(v4, `SELECT count(*)::int n FROM "Event" WHERE "published"=true`)
for (const t of ['dancers','profiles','festivals'])
  out.target_2026[t] = await one(tgt, `SELECT count(*)::int n FROM ${t}`)
console.log(JSON.stringify(out, null, 2))
