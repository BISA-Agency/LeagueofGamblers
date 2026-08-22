CREATE TYPE "public"."event_source" AS ENUM('odds_api', 'admin');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('upcoming', 'suspended', 'live', 'finished', 'void');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('open', 'suspended', 'closed', 'settled', 'void');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('h2h', 'totals', 'spreads', 'custom');--> statement-breakpoint
CREATE TYPE "public"."outcome_result" AS ENUM('won', 'lost', 'void', 'half_won', 'half_lost');--> statement-breakpoint
CREATE TYPE "public"."odds_import_status" AS ENUM('preview', 'published', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."bet_kind" AS ENUM('sportsbook', 'proof');--> statement-breakpoint
CREATE TYPE "public"."bet_status" AS ENUM('open', 'won', 'lost', 'void', 'half_won', 'half_lost');--> statement-breakpoint
CREATE TYPE "public"."bet_type" AS ENUM('single', 'combi');--> statement-breakpoint
CREATE TYPE "public"."bookmaker" AS ENUM('toto', 'unibet', 'bet365', 'holland_casino', 'jacks', 'betcity', 'overig');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('n/a', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."bet_flag_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."sanction_type" AS ENUM('warning', 'balance_penalty', 'disqualification');--> statement-breakpoint
CREATE TYPE "public"."badge_rarity" AS ENUM('common', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."mission_applies_to" AS ENUM('sportsbook', 'proof', 'both');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('buy_in', 'payout_mission', 'payout_prize', 'refund');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('cash', 'bank', 'crypto');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TABLE "prize_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_players" integer NOT NULL,
	"max_players" integer,
	"split" jsonb NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid,
	"source" "event_source" NOT NULL,
	"external_id" text,
	"sport_key" text NOT NULL,
	"sport_label" text NOT NULL,
	"competition" text,
	"home_team" text,
	"away_team" text,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "event_status" DEFAULT 'upcoming' NOT NULL,
	"result" jsonb,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" "market_type" NOT NULL,
	"label" text NOT NULL,
	"line" numeric(6, 2),
	"status" "market_status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"label" text NOT NULL,
	"odds" numeric(8, 2) NOT NULL,
	"result" "outcome_result"
);
--> statement-breakpoint
CREATE TABLE "odds_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ran_by" uuid,
	"credits_used" integer,
	"credits_remaining" integer,
	"events_count" integer DEFAULT 0 NOT NULL,
	"status" "odds_import_status" DEFAULT 'preview' NOT NULL,
	"diff" jsonb
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "bet_kind" NOT NULL,
	"type" "bet_type" NOT NULL,
	"stake" numeric(12, 2) NOT NULL,
	"total_odds" numeric(10, 3) NOT NULL,
	"potential_payout" numeric(12, 2) NOT NULL,
	"status" "bet_status" DEFAULT 'open' NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_start" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"settled_by" uuid,
	"settlement_source" text,
	"note" text,
	"bookmaker" "bookmaker",
	"screenshot_url" text,
	"verification_status" "verification_status" DEFAULT 'n/a' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "bet_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bet_id" uuid NOT NULL,
	"outcome_id" uuid,
	"event_name" text NOT NULL,
	"event_start" timestamp with time zone NOT NULL,
	"sport" text NOT NULL,
	"competition" text,
	"market_label" text NOT NULL,
	"selection_label" text NOT NULL,
	"odds" numeric(8, 2) NOT NULL,
	"result" "outcome_result"
);
--> statement-breakpoint
CREATE TABLE "bet_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bet_id" uuid NOT NULL,
	"flagged_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "bet_flag_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"type" "sanction_type" NOT NULL,
	"amount" numeric(12, 2),
	"reason" text NOT NULL,
	"bet_id" uuid,
	"issued_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"rarity" "badge_rarity" NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applies_to" "mission_applies_to" DEFAULT 'both' NOT NULL,
	"reward_amount" numeric(12, 2),
	"reward_badge_id" uuid,
	"reward_xp" integer,
	"max_winners" integer,
	"repeatable" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mission_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bet_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"challenge_id" uuid,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"awarded_by" uuid,
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" DEFAULT 'cash' NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reference" text,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_imports" ADD CONSTRAINT "odds_imports_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_imports" ADD CONSTRAINT "odds_imports_ran_by_profiles_id_fk" FOREIGN KEY ("ran_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_settled_by_profiles_id_fk" FOREIGN KEY ("settled_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_selections" ADD CONSTRAINT "bet_selections_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_selections" ADD CONSTRAINT "bet_selections_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_flags" ADD CONSTRAINT "bet_flags_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_flags" ADD CONSTRAINT "bet_flags_flagged_by_profiles_id_fk" FOREIGN KEY ("flagged_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_flags" ADD CONSTRAINT "bet_flags_resolved_by_profiles_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_issued_by_profiles_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_reward_badge_id_badges_id_fk" FOREIGN KEY ("reward_badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_awarded_by_profiles_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_profiles_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;