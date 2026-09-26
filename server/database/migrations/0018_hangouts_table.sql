CREATE TABLE "hangouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"time" text NOT NULL,
	"venue" text,
	"host" text,
	"city_slug" text NOT NULL,
	"people_count" integer DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"dancer_id" uuid NOT NULL REFERENCES "dancers"("id"),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "hangout_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hangout_id" uuid NOT NULL REFERENCES "hangouts"("id"),
	"dancer_id" uuid NOT NULL REFERENCES "dancers"("id"),
	"created_at" timestamp DEFAULT now(),
	UNIQUE("hangout_id", "dancer_id")
);
