CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"local_name" text,
	"country" text,
	"country_code" text,
	"region" text,
	"lat" double precision,
	"lng" double precision,
	"alt_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cities_google_place_id_uidx" ON "cities" USING btree ("google_place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_uidx" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cities_name_lower_idx" ON "cities" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "cities_local_name_lower_idx" ON "cities" USING btree (lower("local_name"));--> statement-breakpoint
CREATE INDEX "cities_alt_names_gin_idx" ON "cities" USING gin ("alt_names");