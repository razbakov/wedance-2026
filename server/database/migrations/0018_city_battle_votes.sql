CREATE TABLE IF NOT EXISTS "city_battle_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_month" text NOT NULL,
	"winner_city_slug" text NOT NULL,
	"loser_city_slug" text NOT NULL,
	"winner_video_id" uuid,
	"loser_video_id" uuid,
	"voter_session_id" text NOT NULL,
	"voter_dancer_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city_battle_votes" ADD CONSTRAINT "city_battle_votes_voter_dancer_id_dancers_id_fk" FOREIGN KEY ("voter_dancer_id") REFERENCES "public"."dancers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_battle_votes_session_idx" ON "city_battle_votes" USING btree ("voter_session_id","competition_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_battle_votes_month_idx" ON "city_battle_votes" USING btree ("competition_month");
