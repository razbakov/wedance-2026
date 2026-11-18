-- The color-and-shape meetup on a real Meet match (RAZ-1071).
--
-- One row per dancer, per dance friend, per event they booked together.
-- booked_at: they confirmed they're going. revealed_at: they turned the phone
-- toward the other person. problem/note: they came back and said what went wrong.
-- how: the morning-after "how was it". email_sent_at: that email went out once.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS meet_rituals;

CREATE TABLE IF NOT EXISTS "meet_rituals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dancer_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "other_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "booked_at" timestamp,
  "revealed_at" timestamp,
  "problem" text,
  "note" text,
  "reported_at" timestamp,
  "how" text,
  "email_sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "meet_rituals_pair_event" UNIQUE ("dancer_id", "other_id", "event_id")
);
CREATE INDEX IF NOT EXISTS "meet_rituals_due_idx" ON "meet_rituals" ("event_id", "email_sent_at");
