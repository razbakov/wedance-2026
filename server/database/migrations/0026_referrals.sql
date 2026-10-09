-- P319 Referral discount links: a verified ticket holder can share a referral
-- code (their username) for a festival; the buyer gets a discount and the
-- referrer is credited when payment completes.
-- Rollback: DROP TABLE "referrals";

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "festival_id" uuid NOT NULL REFERENCES "festivals"("id"),
  "referrer_id" uuid NOT NULL REFERENCES "dancers"("id"),
  "referee_id" uuid NOT NULL REFERENCES "dancers"("id"),
  "discount_cents" integer NOT NULL DEFAULT 0,
  "stripe_session_id" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now(),
  "completed_at" timestamp,
  CONSTRAINT "referral_festival_referee_unique" UNIQUE ("festival_id", "referee_id")
);

CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" ("referrer_id");
