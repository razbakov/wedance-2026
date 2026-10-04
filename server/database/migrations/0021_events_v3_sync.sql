-- Events: bring the hand-made `events` table under Drizzle and add the columns
-- the wedance.vip (v3) → 2026 event sync needs. Fully idempotent and additive:
-- safe on prod (table exists, 9,580 archived v4 rows untouched) and on a fresh DB.
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text,
  "name" text,
  "type" text,
  "description" text DEFAULT '',
  "cover" text DEFAULT '',
  "start_date" timestamp,
  "end_date" timestamp,
  "is_festival" boolean DEFAULT false,
  "ticket_url" text,
  "price" text DEFAULT '',
  "city" text,
  "venue_username" text,
  "organizer_username" text,
  "styles" jsonb DEFAULT '[]',
  "archived" boolean NOT NULL DEFAULT true,
  "published" boolean NOT NULL DEFAULT false,
  "source_ref" jsonb,
  "created_at" timestamp DEFAULT now()
);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "city_slug" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "timezone" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_address" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_lat" double precision;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_lng" double precision;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organizer_name" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "series_id" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "synced_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_uidx" ON "events" ("slug") WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "events_archived_idx" ON "events" ("archived");
CREATE UNIQUE INDEX IF NOT EXISTS "events_source_uidx" ON "events" ("source", "source_id") WHERE "source_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "events_city_start_idx" ON "events" ("city_slug", "start_date");
