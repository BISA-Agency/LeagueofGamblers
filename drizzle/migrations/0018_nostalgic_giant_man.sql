CREATE TABLE "daily_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"match_day" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_matches_challenge_day_unique" UNIQUE("challenge_id","match_day")
);
--> statement-breakpoint
CREATE TABLE "score_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"home_goals" integer NOT NULL,
	"away_goals" integer NOT NULL,
	"reward_amount" numeric(12, 2),
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_predictions_match_user_unique" UNIQUE("daily_match_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "daily_matches" ADD CONSTRAINT "daily_matches_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_matches" ADD CONSTRAINT "daily_matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_matches" ADD CONSTRAINT "daily_matches_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_predictions" ADD CONSTRAINT "score_predictions_daily_match_id_daily_matches_id_fk" FOREIGN KEY ("daily_match_id") REFERENCES "public"."daily_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_predictions" ADD CONSTRAINT "score_predictions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;