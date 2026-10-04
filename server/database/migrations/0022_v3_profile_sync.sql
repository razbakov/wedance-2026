-- v3 → 2026 profile sync: link events to venue / organiser / artist profiles.
-- Idempotent and additive.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "source_ref" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "artists" jsonb DEFAULT '[]';
CREATE INDEX IF NOT EXISTS "events_venue_username_idx" ON "events" ("venue_username");
CREATE INDEX IF NOT EXISTS "events_organizer_username_idx" ON "events" ("organizer_username");
CREATE INDEX IF NOT EXISTS "profiles_source_idx" ON "profiles" (("source_ref"->>'source'));
