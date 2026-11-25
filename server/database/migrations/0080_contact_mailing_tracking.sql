-- What happened to each email a page sent its contacts: delivered, opened,
-- clicked, bounced, marked as spam. One row per recipient of a
-- contact_mailings send, matched to Resend's webhook events by resend_id.
-- A hard bounce sets profile_contacts.bounced_at, which stops the page from
-- emailing that address again (contactSegments.emailBlock → 'bounced').
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS contact_mailing_recipients;
--   ALTER TABLE profile_contacts DROP COLUMN IF EXISTS bounced_at;

CREATE TABLE IF NOT EXISTS "contact_mailing_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mailing_id" uuid NOT NULL REFERENCES "contact_mailings"("id") ON DELETE CASCADE,
  "contact_id" uuid REFERENCES "profile_contacts"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "resend_id" text,
  "status" text DEFAULT 'sent' NOT NULL,
  "delivered_at" timestamp,
  "bounced_at" timestamp,
  "bounce_type" text,
  "complained_at" timestamp,
  "first_opened_at" timestamp,
  "opens" integer DEFAULT 0 NOT NULL,
  "first_clicked_at" timestamp,
  "clicks" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "contact_mailing_recipients_resend_uidx" ON "contact_mailing_recipients" ("resend_id");
CREATE INDEX IF NOT EXISTS "contact_mailing_recipients_mailing_idx" ON "contact_mailing_recipients" ("mailing_id");
CREATE INDEX IF NOT EXISTS "contact_mailing_recipients_contact_idx" ON "contact_mailing_recipients" ("contact_id");

ALTER TABLE "profile_contacts" ADD COLUMN IF NOT EXISTS "bounced_at" timestamp;
