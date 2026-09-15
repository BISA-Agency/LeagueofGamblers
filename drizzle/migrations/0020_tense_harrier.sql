CREATE TYPE "public"."bounty_round_status" AS ENUM('collecting', 'settled', 'unclaimed');--> statement-breakpoint
ALTER TYPE "public"."payment_direction" ADD VALUE 'payout_bounty' BEFORE 'refund';--> statement-breakpoint
CREATE TABLE "bounty_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_round_match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"home_goals" integer NOT NULL,
	"away_goals" integer NOT NULL,
	"points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounty_predictions_match_user_unique" UNIQUE("bounty_round_match_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "bounty_round_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_round_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "bounty_round_matches_round_event_unique" UNIQUE("bounty_round_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "bounty_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"busted_user_id" uuid NOT NULL,
	"status" "bounty_round_status" DEFAULT 'collecting' NOT NULL,
	"payout_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bounty_predictions" ADD CONSTRAINT "bounty_predictions_bounty_round_match_id_bounty_round_matches_id_fk" FOREIGN KEY ("bounty_round_match_id") REFERENCES "public"."bounty_round_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_predictions" ADD CONSTRAINT "bounty_predictions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_round_matches" ADD CONSTRAINT "bounty_round_matches_bounty_round_id_bounty_rounds_id_fk" FOREIGN KEY ("bounty_round_id") REFERENCES "public"."bounty_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_round_matches" ADD CONSTRAINT "bounty_round_matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_rounds" ADD CONSTRAINT "bounty_rounds_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_rounds" ADD CONSTRAINT "bounty_rounds_busted_user_id_profiles_id_fk" FOREIGN KEY ("busted_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;