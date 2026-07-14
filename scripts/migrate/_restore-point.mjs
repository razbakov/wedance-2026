import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const now = (await sql.query(`SELECT now()::text t`)).rows?.[0]?.t ?? (await sql.query(`SELECT now()::text t`))[0].t
const pre = (await sql.query(`SELECT * FROM dancers`)).rows ?? []
console.log(JSON.stringify({ restore_point_utc: now, pre_migration_dancer_count: pre.length, pre_rows: pre }, null, 2))
