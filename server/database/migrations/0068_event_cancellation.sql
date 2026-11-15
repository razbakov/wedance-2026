-- Organisers cancel an event (RAZ-948): it stays published and listed, marked
-- "Cancelled" with the organiser's reason, and everyone who signed up is emailed.
-- Undo clears the three columns.
--
--   cancelled_at   when it was cancelled (NULL = on)
--   cancel_reason  optional short reason shown with it ("Tanzverbot today")
--   cancelled_by   the dancer who cancelled it
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE events DROP COLUMN IF EXISTS cancelled_at, DROP COLUMN IF EXISTS cancel_reason,
--     DROP COLUMN IF EXISTS cancelled_by;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL;
