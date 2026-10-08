-- P726 Style & level mix: a dancer's self-declared level per style,
-- e.g. {"Salsa": "Advanced", "Bachata": "Beginner"}. Additive + idempotent.
-- Rollback: ALTER TABLE "dancers" DROP COLUMN "dance_levels";
ALTER TABLE "dancers" ADD COLUMN IF NOT EXISTS "dance_levels" jsonb NOT NULL DEFAULT '{}'::jsonb;
