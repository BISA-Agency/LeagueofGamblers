import { integer, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const oddsImportStatusEnum = pgEnum("odds_import_status", [
  "preview",
  "published",
  "discarded",
]);

export const oddsImports = pgTable("odds_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  ranBy: uuid("ran_by").references(() => profiles.id),
  creditsUsed: integer("credits_used"),
  creditsRemaining: integer("credits_remaining"),
  eventsCount: integer("events_count").notNull().default(0),
  status: oddsImportStatusEnum("status").notNull().default("preview"),
  // Diff vs. the previous published import: new/changed/removed events (§5.3).
  diff: jsonb("diff"),
});

export type OddsImport = typeof oddsImports.$inferSelect;
export type NewOddsImport = typeof oddsImports.$inferInsert;
