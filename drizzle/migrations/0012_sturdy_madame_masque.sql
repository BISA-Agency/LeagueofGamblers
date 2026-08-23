ALTER TABLE "profiles" ADD COLUMN "payout_address" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "payout_network" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "platform_fee_percent" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "network" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "screenshot_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "token_amount" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fee_amount" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tx_hash_unique" UNIQUE("tx_hash");--> statement-breakpoint
-- Everything that exists today was settled in cash between friends. The 10%
-- default is for challenges created from here on, not applied retroactively.
UPDATE "challenges" SET "platform_fee_percent" = 0;
