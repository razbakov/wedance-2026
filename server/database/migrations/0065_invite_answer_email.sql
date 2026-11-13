-- Answer emails: whoever answers an artist invite or a venue ask leaves an email.
-- They get the answer in writing with a "That's me" link (a magic link); clicking
-- it proves the address, so the organiser sees a confirmed answer, not a forwarded link.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE profile_invites DROP COLUMN IF EXISTS answer_email,
--     DROP COLUMN IF EXISTS answered_by, DROP COLUMN IF EXISTS email_confirmed_at,
--     DROP COLUMN IF EXISTS answer_email_sent_at;

BEGIN;

ALTER TABLE "profile_invites" ADD COLUMN IF NOT EXISTS "answer_email" text;
ALTER TABLE "profile_invites" ADD COLUMN IF NOT EXISTS "answered_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL;
ALTER TABLE "profile_invites" ADD COLUMN IF NOT EXISTS "email_confirmed_at" timestamp;
-- When the copy last went out: "Send it again" waits a minute between sends.
ALTER TABLE "profile_invites" ADD COLUMN IF NOT EXISTS "answer_email_sent_at" timestamp;

COMMIT;
