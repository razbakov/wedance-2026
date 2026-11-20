-- Event reviews from people who went (RAZ-1011).
--
-- reviews.went: the reviewer signed up for the event (poll, Going!, ticket) and wrote it after
-- the night — shown as "went" in the list. Older event reviews stay unmarked.
--
-- event_review_asks: the morning-after "How was it?" email, one row per event per address
-- (the unique key is the once-only guard; the cron inserts before sending). `token` is the
-- "didn't make it" link: missed_at set = never asked again, not on the page either.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS event_review_asks;
--   ALTER TABLE reviews DROP COLUMN IF EXISTS went;

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "went" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "event_review_asks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "token" text NOT NULL,
  "sent_at" timestamp,
  "missed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_review_asks_event_email_uidx" ON "event_review_asks" ("event_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "event_review_asks_token_uidx" ON "event_review_asks" ("token");
