-- City channels: the WeDance page that runs a city's own accounts (e.g. @wedancemunich),
-- its weekly schedule posts, and a community-grown directory of local groups.
--
--   city_pages        one WeDance business page per city. Its team = the city's admins;
--                     its Instagram connection (#501) is the city's account.
--   city_schedules    the weekly "what's on" post per city and week: chosen events, text,
--                     rendered picture, and where it was posted (Instagram / Telegram).
--   community_groups  + official channels (kind='official', run by the city page, optional
--                     Telegram chat id for the bot), public submissions (status 'pending' →
--                     reviewed by the city's admins), a normalised invite key for dedupe,
--                     and the result of the last invite-link check.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS city_schedules; DROP TABLE IF EXISTS city_pages;
--   DROP INDEX IF EXISTS community_groups_invite_key_uidx;
--   ALTER TABLE community_groups DROP COLUMN IF EXISTS kind, DROP COLUMN IF EXISTS profile_id,
--     DROP COLUMN IF EXISTS telegram_chat_id, DROP COLUMN IF EXISTS description,
--     DROP COLUMN IF EXISTS submitted_by, DROP COLUMN IF EXISTS reviewed_by, DROP COLUMN IF EXISTS reviewed_at,
--     DROP COLUMN IF EXISTS invite_key, DROP COLUMN IF EXISTS link_status, DROP COLUMN IF EXISTS link_checked_at;
--   DELETE FROM community_groups WHERE status IN ('pending', 'rejected');

BEGIN;

CREATE TABLE IF NOT EXISTS "city_pages" (
  "city_slug" text PRIMARY KEY,
  "profile_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "created_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "city_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "city_slug" text NOT NULL,
  "week_start" date NOT NULL,
  "event_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "text" text NOT NULL DEFAULT '',
  "text_edited" boolean NOT NULL DEFAULT false,
  "image_url" text,
  "image_key" text,
  "ig_media_id" text,
  "ig_permalink" text,
  "ig_published_at" timestamp,
  "ig_story_media_id" text,
  "ig_story_published_at" timestamp,
  "telegram" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "publish_error" text,
  "created_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "city_schedules_city_week" UNIQUE ("city_slug", "week_start")
);

ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'community';
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "profile_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "submitted_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "invite_key" text;
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "link_status" text NOT NULL DEFAULT 'unknown';
ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "link_checked_at" timestamp;

-- Backfill the dedupe key (host + path, lowercased, no scheme / www / query / trailing slash;
-- WhatsApp codes are case-sensitive, so their path keeps its case). Only the oldest row of a
-- set of copies gets it, so the unique index below can't fail on existing duplicates.
UPDATE "community_groups" g SET "invite_key" = k.key
FROM (
  SELECT DISTINCT ON (key) id, key FROM (
    SELECT id, created_at,
      CASE WHEN lower(invite_url) ~ '^https?://(www\.)?chat\.whatsapp\.com/'
        THEN 'chat.whatsapp.com/' || regexp_replace(regexp_replace(invite_url, '^https?://(www\.)?chat\.whatsapp\.com/(invite/)?', '', 'i'), '[/?#].*$', '')
        ELSE regexp_replace(lower(regexp_replace(regexp_replace(invite_url, '^https?://(www\.)?', '', 'i'), '[?#].*$|/+$', '', 'g')), '^telegram\.(me|dog)/', 't.me/')
      END AS key
    FROM "community_groups" WHERE "invite_key" IS NULL
  ) s
  ORDER BY key, created_at
) k
WHERE g.id = k.id AND NOT EXISTS (SELECT 1 FROM "community_groups" o WHERE o."invite_key" = k.key);

CREATE UNIQUE INDEX IF NOT EXISTS "community_groups_invite_key_uidx" ON "community_groups" ("invite_key") WHERE "invite_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "community_groups_city_status_idx" ON "community_groups" ("city_slug", "status");

COMMIT;
