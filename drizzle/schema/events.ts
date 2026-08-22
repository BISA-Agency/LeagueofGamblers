import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { challenges } from "./challenges";

export const eventSourceEnum = pgEnum("event_source", ["odds_api", "admin"]);
export const eventStatusEnum = pgEnum("event_status", [
  "upcoming",
  "suspended",
  "live",
  "finished",
  "void",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = shared across challenges (the common case for odds_api events).
    challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
    source: eventSourceEnum("source").notNull(),
    // The Odds API event id, or null for admin-created events.
    externalId: text("external_id"),
    sportKey: text("sport_key").notNull(),
    sportLabel: text("sport_label").notNull(),
    competition: text("competition"),
    homeTeam: text("home_team"),
    awayTeam: text("away_team"),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: eventStatusEnum("status").notNull().default("upcoming"),
    result: jsonb("result"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => [
    // Lets a re-import upsert the same event instead of duplicating it.
    unique("events_challenge_external_unique").on(table.challengeId, table.externalId),
  ]
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
