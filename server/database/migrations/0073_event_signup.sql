-- Signing up for a class (RAZ-995): one button, then the steps — how you come, which pass, pay now or at the
-- door, your contact. The poll answer (event_rsvps) now carries the rest of the sign-up: the name and phone the
-- organiser gets for this event (a guest's, until the magic link folds it into their account), the partner's
-- name, the pass, how they pay, and the separate "tell me about next ones" opt-in. A dancer's phone is kept on
-- the account, so the next sign-up only asks to confirm.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   ALTER TABLE event_rsvps DROP COLUMN IF EXISTS name, DROP COLUMN IF EXISTS phone,
--     DROP COLUMN IF EXISTS partner_name, DROP COLUMN IF EXISTS pass, DROP COLUMN IF EXISTS pay,
--     DROP COLUMN IF EXISTS keep_in_touch;
--   ALTER TABLE dancers DROP COLUMN IF EXISTS phone;

ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "partner_name" text;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "pass" text;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "pay" text;
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "keep_in_touch" boolean NOT NULL DEFAULT false;

ALTER TABLE "dancers" ADD COLUMN IF NOT EXISTS "phone" text;
