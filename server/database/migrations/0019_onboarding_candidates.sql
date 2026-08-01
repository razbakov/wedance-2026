CREATE TABLE IF NOT EXISTS "onboarding_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"telegram_id" text,
	"role" text,
	"level" integer DEFAULT 0 NOT NULL,
	"quest" json DEFAULT '{"cuj_events":{}}'::json,
	"access_granted" boolean DEFAULT false NOT NULL,
	"history" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
