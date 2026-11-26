-- A yes on a booking request stays on WeDance (RAZ-1089): which page asked,
-- the draft event that yes created, and the one reminder for a request
-- still unanswered after three days.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP INDEX IF EXISTS booking_inquiries_open_idx;
--   ALTER TABLE booking_inquiries
--     DROP COLUMN IF EXISTS asker_profile_id,
--     DROP COLUMN IF EXISTS event_id,
--     DROP COLUMN IF EXISTS reminded_at;

ALTER TABLE "booking_inquiries" ADD COLUMN IF NOT EXISTS "asker_profile_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;
ALTER TABLE "booking_inquiries" ADD COLUMN IF NOT EXISTS "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL;
ALTER TABLE "booking_inquiries" ADD COLUMN IF NOT EXISTS "reminded_at" timestamp;
CREATE INDEX IF NOT EXISTS "booking_inquiries_open_idx" ON "booking_inquiries" ("status", "created_at");
