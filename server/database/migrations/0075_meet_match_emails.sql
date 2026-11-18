-- Dance friends: tell the other dancer by email when a Yes becomes mutual (RAZ-985).
--
-- dancers.match_emails: the dancer's opt-out (Settings → Emails, or the link in the email). Default on.
-- meet_match_emails: one row per (recipient, other dancer) once an email went out, so a match is emailed
-- once, and a recipient gets at most one such email a day (newest sent_at per recipient).
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS meet_match_emails;
--   ALTER TABLE dancers DROP COLUMN IF EXISTS match_emails;

ALTER TABLE "dancers" ADD COLUMN IF NOT EXISTS "match_emails" boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "meet_match_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "other_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "meet_match_emails_pair" UNIQUE ("recipient_id", "other_id")
);
CREATE INDEX IF NOT EXISTS "meet_match_emails_recipient_idx" ON "meet_match_emails" ("recipient_id", "sent_at");
