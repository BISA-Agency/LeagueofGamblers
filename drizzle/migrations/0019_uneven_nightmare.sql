CREATE TYPE "public"."challenge_duration_type" AS ENUM('week', 'month', 'season', 'custom');--> statement-breakpoint
CREATE TYPE "public"."challenge_prize_mode" AS ENUM('standard', 'hardcore');--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "duration_type" "challenge_duration_type" DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "prize_mode" "challenge_prize_mode" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "late_join_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "bounty_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "bounty_per_player" numeric(12, 2) DEFAULT 0 NOT NULL;