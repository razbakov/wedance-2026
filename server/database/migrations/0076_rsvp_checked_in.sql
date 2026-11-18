-- Door check-in for a signed-out RSVP (RAZ-928). A guest who typed their name
-- has no attendance row until the magic link confirms the account, so the door
-- marks this row. Confirming copies checked_in_at onto attendances.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_rsvps DROP COLUMN IF EXISTS checked_in_at;

ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp;
