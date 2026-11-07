-- Feed or story (#501): a content-plan post can go to the Instagram feed and,
-- separately, to stories. ig_media_id / ig_permalink stay the feed post;
-- ig_story_* are the story. Stories published before this (permalink under
-- /stories/) move to the story columns.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_posts DROP COLUMN IF EXISTS ig_story_media_id, DROP COLUMN IF EXISTS ig_story_permalink,
--     DROP COLUMN IF EXISTS story_published_at;

BEGIN;

ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "ig_story_media_id" text;
ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "ig_story_permalink" text;
ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "story_published_at" timestamp;

UPDATE "event_posts"
SET "ig_story_media_id" = "ig_media_id", "ig_story_permalink" = "ig_permalink", "story_published_at" = "published_at",
    "ig_media_id" = NULL, "ig_permalink" = NULL, "published_at" = NULL
WHERE "ig_permalink" LIKE '%/stories/%' AND "ig_story_media_id" IS NULL;

COMMIT;
