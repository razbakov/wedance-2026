-- An artist's song list, services and public pricing (RAZ-1084, shared/types/artistOffer.ts).
-- Shown on /@handle for organizers planning a playlist or a booking. Pricing is only
-- what the artist wrote: an empty string means they have not stated a price.
--
-- Typed on WeDance only. The v3 sync never writes this column.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE profiles DROP COLUMN IF EXISTS artist_offer;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "artist_offer" jsonb NOT NULL DEFAULT '{"songs":[],"services":[],"pricing":""}'::jsonb;
