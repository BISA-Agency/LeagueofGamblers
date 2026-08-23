ALTER TABLE "profiles" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_invite_code_unique" UNIQUE("invite_code");--> statement-breakpoint
-- Drizzle cannot express an inline self-reference, so the FK is added here.
-- ON DELETE SET NULL: deleting an inviter must not cascade away the people
-- they brought in.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_invited_by_profiles_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null;
