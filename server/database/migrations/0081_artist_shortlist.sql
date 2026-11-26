-- Organiser shortlist (RAZ-1085): a private booking list of artists.
-- Separate from follows. The artist is not told, and nothing is emailed.
--
-- Additive and idempotent. Applied by scripts/db-migrate.ts on deploy.
--
-- Rollback:
--   DROP TABLE IF EXISTS artist_shortlist;

CREATE TABLE IF NOT EXISTS "artist_shortlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dancer_id" uuid NOT NULL REFERENCES "dancers"("id") ON DELETE CASCADE,
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "occasion" text,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "artist_shortlist_dancer_profile" UNIQUE ("dancer_id", "profile_id"),
  CONSTRAINT "artist_shortlist_occasion" CHECK ("occasion" is null or "occasion" in ('wedding', 'birthday', 'corporate', 'other')),
  CONSTRAINT "artist_shortlist_note_len" CHECK ("note" is null or char_length("note") <= 500)
);
