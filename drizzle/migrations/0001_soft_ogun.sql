ALTER TABLE "profiles" DROP CONSTRAINT "username_format";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "username_format" CHECK ("profiles"."username" ~ '^[a-z0-9_]{3,24}$');