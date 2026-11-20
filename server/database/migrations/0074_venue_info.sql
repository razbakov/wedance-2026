-- A venue's own hints (RAZ-1012): nearest stop, parking, indoor dance shoes only, cloakroom — what is true
-- about the venue for every event held there (shared/types/venueInfo.ts). Shown in the event hero's venue row.
--
-- The cloakroom lives only here, as yes / no / not said: the presence-only "CoatCheck" amenity (synced from
-- v3) can't say "no", so it moves into venue_info.cloakroom = 'yes' and leaves the amenities list.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   UPDATE profiles SET amenities = amenities || '["CoatCheck"]'::jsonb
--     WHERE venue_info->>'cloakroom' = 'yes' AND NOT amenities ? 'CoatCheck';
--   ALTER TABLE profiles DROP COLUMN IF EXISTS venue_info;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "venue_info" jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE "profiles"
SET "venue_info" = CASE WHEN "venue_info" ? 'cloakroom' THEN "venue_info" ELSE "venue_info" || '{"cloakroom":"yes"}'::jsonb END,
    "amenities" = COALESCE((SELECT jsonb_agg(a) FROM jsonb_array_elements("amenities") a WHERE a <> '"CoatCheck"'::jsonb), '[]'::jsonb)
WHERE "amenities" ? 'CoatCheck';
