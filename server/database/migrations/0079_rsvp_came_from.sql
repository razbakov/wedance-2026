-- Where an event sign-up came from (RAZ-1074): the utm_* tags and outside
-- referrer of the visit. Kept on a guest's sign-up until the magic link
-- confirms it, then copied onto the page's contact (profile_contacts.source).
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_rsvps DROP COLUMN IF EXISTS came_from;

ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "came_from" jsonb;
