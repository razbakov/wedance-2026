-- Weekly times an artist is free for a private event, wedding or corporate
-- booking (RAZ-1087). Venue rooms stay on availability_slots. No rows means
-- the artist has not published times.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS artist_availability;

CREATE TABLE IF NOT EXISTS "artist_availability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "day_of_week" integer NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "artist_availability_profile_idx" ON "artist_availability" ("profile_id");
