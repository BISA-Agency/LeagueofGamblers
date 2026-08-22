-- Hand-edited: the generated statement is the ALTER TABLE below, but until now
-- nothing stopped the same badge being inserted twice (the onConflictDoNothing
-- calls in the award paths had no constraint to conflict against). Any existing
-- duplicates would make the constraint fail, so collapse them first, keeping
-- the earliest award.
DELETE FROM "user_badges" a
USING "user_badges" b
WHERE a."user_id" = b."user_id"
  AND a."badge_id" = b."badge_id"
  AND a."challenge_id" IS NOT DISTINCT FROM b."challenge_id"
  AND (a."awarded_at", a."id") > (b."awarded_at", b."id");
--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_unique" UNIQUE NULLS NOT DISTINCT("user_id","badge_id","challenge_id");
