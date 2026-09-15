ALTER TABLE "challenges" ADD COLUMN "missions_from_pot" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Challenges that were already running (or done) promised their pot with
-- missions on top; keep it that way so nobody sees the number drop.
UPDATE "challenges" SET "missions_from_pot" = false WHERE "status" NOT IN ('draft', 'open');
