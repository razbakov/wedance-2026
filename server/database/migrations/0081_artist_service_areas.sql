-- Artists travel (RAZ-1083): cities besides the home city (profiles.city / city_slug) where the
-- artist is listed. A Barcelona artist who also plays Munich shows up in Munich's artist list,
-- list_artists, and the /artists city filter. Venues and organisers stay in their home city only.
--
-- Stored as [{ "slug": "munich", "name": "Munich" }, ...]. slug is cities.slug.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP INDEX IF EXISTS "profiles_service_areas_gin";
--   ALTER TABLE profiles DROP COLUMN IF EXISTS service_areas;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "service_areas" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "profiles_service_areas_gin" ON "profiles" USING gin ("service_areas" jsonb_path_ops);
