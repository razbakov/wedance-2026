-- Updates sent to a page's contacts (RAZ-960): one row per send from Contacts → "Send an update" —
-- who sent it, when, to which segment and how many people (sent / failed). The words are kept so the
-- page's team can see what went out. Test sends to yourself are not logged. Recipients get a one-click
-- unsubscribe for that page (/api/contacts/unsubscribe, GET + RFC 8058 POST).
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS contact_update_sends;

CREATE TABLE IF NOT EXISTS "contact_update_sends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sent_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "segment" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "segment_label" text NOT NULL DEFAULT '',
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "template" text,
  "recipients" integer NOT NULL DEFAULT 0,
  "failed" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "contact_update_sends_profile_idx" ON "contact_update_sends" ("profile_id", "created_at");
