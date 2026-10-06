CREATE TABLE IF NOT EXISTS "availability_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "space_id" uuid NOT NULL REFERENCES "bookable_spaces"("id"),
  "day_of_week" integer NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "availability_slots_space_idx" ON "availability_slots" ("space_id");
