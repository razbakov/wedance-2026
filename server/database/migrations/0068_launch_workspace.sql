-- Launch workspace: Business → page → Launch. An organiser walks the setup of a
-- new night/business (brand, name, channels) by doing the real work; the step
-- catalogue lives in shared/utils/launch.ts, these tables hold their answers,
-- the name candidates and the evidence behind every check.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS launch_evidence; DROP TABLE IF EXISTS launch_names; DROP TABLE IF EXISTS launch_steps;

BEGIN;

CREATE TABLE IF NOT EXISTS "launch_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "step_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'todo',
  "fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "copy" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "done_at" timestamp,
  "updated_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "launch_steps_status" CHECK ("status" IN ('todo', 'doing', 'done'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "launch_steps_profile_step" ON "launch_steps" ("profile_id", "step_key");

CREATE TABLE IF NOT EXISTS "launch_names" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "decision" text NOT NULL DEFAULT 'candidate',
  "note" text NOT NULL DEFAULT '',
  "created_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "launch_names_decision" CHECK ("decision" IN ('candidate', 'chosen', 'dropped'))
);
CREATE INDEX IF NOT EXISTS "launch_names_profile_idx" ON "launch_names" ("profile_id");
-- One decided name per page.
CREATE UNIQUE INDEX IF NOT EXISTS "launch_names_one_chosen" ON "launch_names" ("profile_id") WHERE "decision" = 'chosen';

CREATE TABLE IF NOT EXISTS "launch_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "step_key" text NOT NULL,
  "name_id" uuid REFERENCES "launch_names"("id") ON DELETE CASCADE,
  "source" text NOT NULL DEFAULT '',
  "url" text,
  "verdict" text,
  "note" text NOT NULL DEFAULT '',
  "via" text NOT NULL DEFAULT 'manual',
  "created_by" uuid REFERENCES "dancers"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "launch_evidence_verdict" CHECK ("verdict" IS NULL OR "verdict" IN ('free', 'taken', 'unclear')),
  -- The evidence rule: "free" is never recorded without a link.
  CONSTRAINT "launch_evidence_free_needs_link" CHECK ("verdict" IS DISTINCT FROM 'free' OR coalesce(btrim("url"), '') <> ''),
  CONSTRAINT "launch_evidence_has_content" CHECK (coalesce(btrim("url"), '') <> '' OR btrim("note") <> '')
);
CREATE INDEX IF NOT EXISTS "launch_evidence_profile_idx" ON "launch_evidence" ("profile_id", "step_key");

COMMIT;
