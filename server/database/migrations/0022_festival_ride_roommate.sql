CREATE TABLE "festival_ride_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"festival_id" uuid NOT NULL,
	"dancer_id" uuid NOT NULL,
	"type" text NOT NULL,
	"origin_city" text NOT NULL,
	"date" date NOT NULL,
	"seats_available" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "festival_ride_dancer_unique" UNIQUE("festival_id","dancer_id")
);
--> statement-breakpoint
CREATE TABLE "festival_roommate_lookups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"festival_id" uuid NOT NULL,
	"dancer_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "festival_roommate_dancer_unique" UNIQUE("festival_id","dancer_id")
);
--> statement-breakpoint
ALTER TABLE "festival_ride_shares" ADD CONSTRAINT "festival_ride_shares_festival_id_festivals_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festivals"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "festival_ride_shares" ADD CONSTRAINT "festival_ride_shares_dancer_id_dancers_id_fk" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "festival_roommate_lookups" ADD CONSTRAINT "festival_roommate_lookups_festival_id_festivals_id_fk" FOREIGN KEY ("festival_id") REFERENCES "public"."festivals"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "festival_roommate_lookups" ADD CONSTRAINT "festival_roommate_lookups_dancer_id_dancers_id_fk" FOREIGN KEY ("dancer_id") REFERENCES "public"."dancers"("id") ON DELETE no action ON UPDATE no action;
