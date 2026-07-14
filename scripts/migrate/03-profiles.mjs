import { neon } from '@neondatabase/serverless'
const v4 = neon(process.env.DIRECT_URL_V4), tgt = neon(process.env.DATABASE_URL)
const DRY = process.argv.includes('--dry-run')
const arr = (r) => r.rows ?? r
const TYPE = { Venue:'venue', Artist:'artist', Organiser:'organizer', FanPage:'organizer' } // decision: FanPage→organizer
const slug = (s) => (s||'').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-')

const rows = arr(await v4.query(`
  SELECT p.id pid, p."firebaseId" fbid, p.username, p.type, p.name, p.bio,
         p."formattedAddress" address, p."mapUrl" map, p.photo, p.claimed,
         p.instagram, p.facebook, p.youtube, p.website, p.tiktok, p.spotify, p.telegram, p.twitter,
         c.name city
  FROM "Profile" p LEFT JOIN "City" c ON c.id = p."cityId"
  WHERE p."isDeleted"=false AND p.type IN ('Venue','Artist','Organiser','FanPage') AND p.username <> ''
`))
// dedup by username (2 dups in source); prefer claimed
const byU = new Map()
for (const p of rows) { const k = p.username.toLowerCase(); const c = byU.get(k); if (!c || (!c.claimed && p.claimed)) byU.set(k, p) }
const list = [...byU.values()]
const socials = (p) => JSON.stringify([['instagram',p.instagram],['facebook',p.facebook],['youtube',p.youtube],['website',p.website],['tiktok',p.tiktok],['spotify',p.spotify],['telegram',p.telegram],['twitter',p.twitter]].filter(([,u])=>u&&u.trim()).map(([platform,url])=>({platform,url})))

let inserted=0, updated=0
const CH=500
for (let i=0;i<list.length;i+=CH){
  const b=list.slice(i,i+CH)
  const C={u:[],t:[],n:[],city:[],cs:[],photo:[],bio:[],addr:[],map:[],soc:[],claimed:[],sref:[]}
  for(const p of b){
    C.u.push(p.username); C.t.push(TYPE[p.type]); C.n.push(p.name||p.username); C.city.push(p.city||null)
    C.cs.push(p.city?slug(p.city):null); C.photo.push(p.photo||null); C.bio.push(p.bio||null); C.addr.push(p.address||null)
    C.map.push(p.map||null); C.soc.push(socials(p)); C.claimed.push(!!p.claimed)
    C.sref.push(JSON.stringify({v4ProfileId:p.pid, firebaseId:p.fbid||null, v4Type:p.type}))
  }
  if(DRY){inserted+=b.length;continue}
  const q=`INSERT INTO profiles (username,type,name,city,city_slug,photo,bio,address,map_url,socials,claimed,source_ref)
    SELECT * FROM unnest($1::text[],$2::text[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[],$8::text[],$9::text[],$10::jsonb[],$11::boolean[],$12::jsonb[])
    ON CONFLICT (username) DO UPDATE SET type=EXCLUDED.type, name=EXCLUDED.name,
      city=COALESCE(EXCLUDED.city,profiles.city), city_slug=COALESCE(EXCLUDED.city_slug,profiles.city_slug),
      photo=COALESCE(EXCLUDED.photo,profiles.photo), bio=COALESCE(EXCLUDED.bio,profiles.bio),
      address=COALESCE(EXCLUDED.address,profiles.address), map_url=COALESCE(EXCLUDED.map_url,profiles.map_url),
      socials=EXCLUDED.socials, claimed=EXCLUDED.claimed, source_ref=EXCLUDED.source_ref
    RETURNING (xmax=0) AS is_insert`
  const res=arr(await tgt.query(q,[C.u,C.t,C.n,C.city,C.cs,C.photo,C.bio,C.addr,C.map,C.soc,C.claimed,C.sref]))
  for(const r of res)(r.is_insert?inserted++:updated++)
  process.stderr.write(`  …${Math.min(i+CH,list.length)}/${list.length}\n`)
}
const bytype=arr(await tgt.query(`SELECT type,count(*)::int n FROM profiles WHERE source_ref IS NOT NULL GROUP BY type ORDER BY n DESC`))
console.log(JSON.stringify({mode:DRY?'DRY':'WRITE',source_rows:list.length,inserted,updated,target_by_type:bytype},null,2))
