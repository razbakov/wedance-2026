-- apply-baseline.sql
-- Run this ONCE against production BEFORE the first deploy that uses
-- `drizzle-kit migrate`. It records the baseline migration as already applied
-- so drizzle never attempts to CREATE the 50 tables that already exist.
--
-- What it does:
--   1. Creates the drizzle schema and __drizzle_migrations table if missing.
--   2. Removes stale entries from the old journal (tags that no longer exist).
--   3. Inserts one row for 0000_baseline, matching meta/_journal.json.
--
-- After this, `drizzle-kit migrate` will skip 0000_baseline and apply
-- 0001_add_cities (creates the `cities` table) onwards.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/apply-baseline.sql
--
-- Verify:
--   psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations"
--   → should show one row: hash='0000_baseline'

BEGIN;

-- 1. Ensure the drizzle schema and journal table exist.
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- 2. Remove old entries — their tags (0000_fat_marten_broadcloak … 0017_tricky_zaran)
--    no longer exist in the new journal and would confuse drizzle-kit.
DELETE FROM drizzle."__drizzle_migrations"
WHERE hash NOT IN ('0000_baseline', '0001_add_cities');

-- 3. Record the baseline as already applied (tag + timestamp from _journal.json).
INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
SELECT '0000_baseline', 1792083166997
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = '0000_baseline'
);

COMMIT;
