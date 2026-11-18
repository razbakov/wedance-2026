-- The flyer's work in progress (RAZ-1033): the step, the uploaded photos and
-- flyers, the look that was read, and which sitting. One per post (the
-- announcement post is the event's flyer). The page saves it on the way out
-- and whenever it changes, and reopens it on the way back, so fixing the title
-- does not start the flyer over.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_posts DROP COLUMN IF EXISTS flyer_draft;

ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "flyer_draft" jsonb;
