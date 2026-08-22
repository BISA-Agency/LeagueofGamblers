-- auth.users already exists (managed by Supabase Auth) — not created here,
-- only referenced by FK below. See drizzle/schema/_auth.ts.
CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('draft', 'open', 'live', 'settling', 'finished');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('joined', 'active', 'bust', 'kicked', 'disqualified');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" "citext" NOT NULL,
	"avatar_url" text,
	"bio" text,
	"status_text" text,
	"favorite_club" text,
	"favorite_sport" text,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"rules_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "username_format" CHECK ("profiles"."username" ~ '^[a-z0-9_]{3,20}$')
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description_md" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "challenge_status" DEFAULT 'draft' NOT NULL,
	"starting_balance" numeric(12, 2) DEFAULT 10000 NOT NULL,
	"buy_in_amount" numeric(12, 2) DEFAULT 100 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"max_players" integer,
	"mission_budget" numeric(12, 2) DEFAULT 0 NOT NULL,
	"prize_split_override" jsonb,
	"sport_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"markets" text[] DEFAULT '{}'::text[] NOT NULL,
	"allow_rebuy" boolean DEFAULT false NOT NULL,
	"auto_publish_imports" boolean DEFAULT false NOT NULL,
	"wallet_address" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_slug_unique" UNIQUE("slug"),
	CONSTRAINT "challenge_dates" CHECK ("challenges"."end_at" > "challenges"."start_at")
);
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" "participant_status" DEFAULT 'joined' NOT NULL,
	"paid_buy_in" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"final_rank" integer,
	"rebuys" integer DEFAULT 0 NOT NULL,
	"warnings" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "challenge_participants_challenge_id_user_id_pk" PRIMARY KEY("challenge_id","user_id"),
	CONSTRAINT "balance_non_negative" CHECK ("challenge_participants"."balance" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;