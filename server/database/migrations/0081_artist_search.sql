-- Artist discovery (RAZ-1086): which private events an artist plays, and the
-- cities they travel to besides the city on their page.
-- event_types: "wedding" | "birthday" | "corporate"
-- service_areas: [{ "city": "Munich", "citySlug": "munich" }, …]
-- A city listing includes an artist whose home city matches, or whose
-- service_areas include that city.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE profiles DROP COLUMN IF EXISTS service_areas;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS event_types;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "event_types" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "service_areas" jsonb NOT NULL DEFAULT '[]'::jsonb;
