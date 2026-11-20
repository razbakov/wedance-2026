-- A page's emails to its contacts (RAZ-975 / RAZ-960): Contacts → "Email N" writes an update to the
-- contacts the current filter shows; only those the page may email get it (shared/utils/contactSegments.ts
-- emailBlock). One row per send: who sent it, when, which segment (the filter in words + as data), the
-- subject and text, the event it invites to, how many it went to and which contacts (the audit trail).
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS contact_mailings;

CREATE TABLE IF NOT EXISTS "contact_mailings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sent_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "segment" text NOT NULL DEFAULT '',
  "filter" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "contact_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "recipients" integer NOT NULL DEFAULT 0,
  "sent" integer NOT NULL DEFAULT 0,
  "failed" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'sending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "finished_at" timestamp
);
CREATE INDEX IF NOT EXISTS "contact_mailings_profile_idx" ON "contact_mailings" ("profile_id", "created_at");
