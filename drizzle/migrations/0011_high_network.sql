ALTER TYPE "public"."market_type" ADD VALUE 'team_totals';--> statement-breakpoint
ALTER TYPE "public"."market_type" ADD VALUE 'btts';--> statement-breakpoint
ALTER TYPE "public"."market_type" ADD VALUE 'double_chance';--> statement-breakpoint
ALTER TYPE "public"."market_type" ADD VALUE 'draw_no_bet';--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "team" text;