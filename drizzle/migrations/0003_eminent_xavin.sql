ALTER TABLE "bet_selections" DROP CONSTRAINT "bet_selections_outcome_id_outcomes_id_fk";
--> statement-breakpoint
ALTER TABLE "bet_selections" ADD CONSTRAINT "bet_selections_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_challenge_external_unique" UNIQUE("challenge_id","external_id");