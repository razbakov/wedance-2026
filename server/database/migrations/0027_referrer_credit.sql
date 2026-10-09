-- Referrer-side discount credit: when a referee's payment succeeds, the
-- referrer earns a credit (same amount as the referee's discount) that is
-- automatically applied to the referrer's next ticket purchase.
--
-- referrer_credit_cents:              credit the referrer earned (set on completion)
-- referrer_credit_applied_session_id: Stripe session that consumed this credit (null = unused)
--
-- Rollback:
--   ALTER TABLE "referrals" DROP COLUMN "referrer_credit_cents";
--   ALTER TABLE "referrals" DROP COLUMN "referrer_credit_applied_session_id";

ALTER TABLE "referrals"
  ADD COLUMN "referrer_credit_cents" integer NOT NULL DEFAULT 0;

ALTER TABLE "referrals"
  ADD COLUMN "referrer_credit_applied_session_id" text;
