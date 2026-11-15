-- A guest's email on their event poll answer (RAZ-948 follow-up). A signed-out
-- dancer answers the poll with a browser token, then leaves an email to get the
-- confirm link. The email is kept on that browser's answers, so if the event is
-- cancelled they are told, even when they never clicked the link.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_rsvps DROP COLUMN IF EXISTS guest_email;

ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "guest_email" text;
