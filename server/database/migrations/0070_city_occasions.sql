-- City occasions (RAZ-970): a city's post for an occasion on its Plan tab — a Bavarian silent
-- day (Tanzverbot), Fasching, Halloween, New Year's Eve, Oktoberfest, open-air season. The
-- occasions themselves are computed (shared/utils/cityOccasions.ts); a row exists once an admin
-- saves, draws, posts or asks the city's organisers. occasion_key = '<id>:<year>'.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS city_occasion_posts;

CREATE TABLE IF NOT EXISTS "city_occasion_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "city_slug" text NOT NULL,
  "occasion_key" text NOT NULL,
  "langs" jsonb NOT NULL DEFAULT '["en"]'::jsonb,
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
  "asked_at" timestamp,
  "asked_profiles" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "ask_message" text,
  "created_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "city_occasion_posts_city_key" UNIQUE ("city_slug", "occasion_key")
);
