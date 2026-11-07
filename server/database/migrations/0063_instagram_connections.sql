-- Connect Instagram (#501): a business page's Instagram professional account,
-- connected through WeDance's official Meta app (Instagram API with Unified
-- login: Facebook Login for Business, system-user token that never expires).
--
-- instagram_connections — one Instagram account per page (and one page per
--   account). The token is encrypted at rest (server/utils/meta/tokenCrypto.ts).
-- instagram_webhook_events — what Meta's webhook delivers for connected
--   accounts (comments, messages, mentions), kept for the inbox.
-- event_posts.ig_* — where a content-plan post went when WeDance published it.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on the first
-- production deploy after merge.
--
-- Rollback:
--   DROP TABLE IF EXISTS instagram_webhook_events;
--   DROP TABLE IF EXISTS instagram_connections;
--   ALTER TABLE event_posts DROP COLUMN IF EXISTS ig_media_id, DROP COLUMN IF EXISTS ig_permalink,
--     DROP COLUMN IF EXISTS published_at, DROP COLUMN IF EXISTS publish_error;

BEGIN;

CREATE TABLE IF NOT EXISTS "instagram_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
  "ig_user_id" text NOT NULL UNIQUE,
  "ig_username" text NOT NULL,
  "ig_name" text,
  "ig_picture" text,
  "token_enc" text NOT NULL,
  "token_kind" text NOT NULL DEFAULT 'system_user',
  "token_expires_at" timestamp,
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "connected_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "connected_at" timestamp NOT NULL DEFAULT now(),
  "last_error" text,
  "last_error_at" timestamp
);

CREATE TABLE IF NOT EXISTS "instagram_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ig_user_id" text NOT NULL,
  "field" text NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "instagram_webhook_events_account_idx" ON "instagram_webhook_events" ("ig_user_id", "received_at");

ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "ig_media_id" text;
ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "ig_permalink" text;
ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "published_at" timestamp;
ALTER TABLE "event_posts" ADD COLUMN IF NOT EXISTS "publish_error" text;

COMMIT;
