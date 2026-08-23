import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./_auth";
import { citext } from "./_helpers";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: citext("username").notNull().unique(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    statusText: text("status_text"),
    favoriteClub: text("favorite_club"),
    favoriteSport: text("favorite_sport"),
    // ISO 3166-1 alpha-2 (e.g. "NL") — rendered as a flag emoji behind the
    // username. Nullable: existing players simply haven't picked one yet.
    country: text("country"),
  // Where prize money goes. Validated per network before it is stored — a
  // wrong address is an irrecoverable payout.
  // Highest level ever reached. XP itself can fall; the level never does.
  levelFloor: integer("level_floor").notNull().default(1),
  payoutAddress: text("payout_address"),
  payoutNetwork: text("payout_network"),
    // Level/title are derived from xp (see lib/levels.ts), not stored — a
    // stored column would drift out of sync with xp the moment level
    // thresholds change.
    xp: integer("xp").notNull().default(0),
    rulesAcceptedAt: timestamp("rules_accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Stored lowercase by the app (see lib/validation/profile.ts) so this check is always satisfied.
    check("username_format", sql`${table.username} ~ '^[a-z0-9_]{3,24}$'`),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
