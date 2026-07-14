import { neon } from '@neondatabase/serverless'
const v4 = neon(process.env.DIRECT_URL_V4), tgt = neon(process.env.DATABASE_URL)
const n = async (sql, q) => { const r = await sql.query(q); return (r.rows??r)[0].n }
const rep = {
  users:    { source: await n(v4,`SELECT count(*)::int n FROM "User" WHERE "isDeleted"=false`),
              migrated: await n(tgt,`SELECT count(*)::int n FROM dancers WHERE source_ref IS NOT NULL`),
              with_password: await n(tgt,`SELECT count(*)::int n FROM dancers WHERE source_ref IS NOT NULL AND COALESCE(hash,'')<>''`) },
  profiles: { source: await n(v4,`SELECT count(*)::int n FROM "Profile" WHERE "isDeleted"=false AND type IN ('Venue','Artist','Organiser','FanPage') AND username<>''`),
              migrated: await n(tgt,`SELECT count(*)::int n FROM profiles WHERE source_ref IS NOT NULL`) },
  events:   { source: await n(v4,`SELECT count(*)::int n FROM "Event" WHERE published=true`),
              migrated: await n(tgt,`SELECT count(*)::int n FROM events WHERE source_ref IS NOT NULL`),
              all_archived_hidden: await n(tgt,`SELECT count(*)::int n FROM events WHERE source_ref IS NOT NULL AND archived AND NOT published`) },
  follows:  { source: await n(v4,`SELECT count(*)::int n FROM "ProfileFollower"`),
              migrated: await n(tgt,`SELECT count(*)::int n FROM follows WHERE source_ref IS NOT NULL`) },
  integrity: {
    orphan_follows: await n(tgt,`SELECT count(*)::int n FROM follows f LEFT JOIN dancers d ON d.id=f.follower_id WHERE d.id IS NULL`),
    dup_dancer_emails: await n(tgt,`SELECT count(*)::int n FROM (SELECT lower(email) e FROM dancers GROUP BY lower(email) HAVING count(*)>1) x`),
    dup_profile_usernames: await n(tgt,`SELECT count(*)::int n FROM (SELECT lower(username) u FROM profiles GROUP BY lower(username) HAVING count(*)>1) x`),
    live_events_leaked: await n(tgt,`SELECT count(*)::int n FROM events WHERE source_ref IS NOT NULL AND (published=true OR archived=false)`),
  },
}
console.log(JSON.stringify(rep, null, 2))
