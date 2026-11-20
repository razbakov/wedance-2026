-- Share my weekend (#527): a dancer shares the parties they're going to this
-- week as a link (/w/<code>) and an Instagram story; friends tap "I'm in" on a
-- party and the sharer gets an email for each one who joins.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS weekend_share_joins; DROP TABLE IF EXISTS weekend_shares;

BEGIN;

CREATE TABLE IF NOT EXISTS "weekend_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "dancer_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "event_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "weekend_shares_dancer_idx" ON "weekend_shares" ("dancer_id");

CREATE TABLE IF NOT EXISTS "weekend_share_joins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "share_id" uuid NOT NULL REFERENCES "weekend_shares"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "dancer_id" uuid REFERENCES "dancers"("id") ON DELETE CASCADE,
  "guest_token" text,
  "name" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "weekend_share_joins_dancer" UNIQUE ("share_id", "event_id", "dancer_id"),
  CONSTRAINT "weekend_share_joins_guest" UNIQUE ("share_id", "event_id", "guest_token"),
  CONSTRAINT "weekend_share_joins_dancer_or_guest" CHECK (num_nonnulls("dancer_id", "guest_token") >= 1)
);
CREATE INDEX IF NOT EXISTS "weekend_share_joins_share_idx" ON "weekend_share_joins" ("share_id");

COMMIT;
