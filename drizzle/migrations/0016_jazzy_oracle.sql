CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'the_odds_api' NOT NULL,
	"endpoint" text NOT NULL,
	"credits_used" integer NOT NULL,
	"credits_remaining" integer,
	"sport_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
