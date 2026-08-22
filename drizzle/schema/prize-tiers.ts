import { integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

// Default staffel (§5.2): admin can extend without code changes.
// split jsonb shape: [{ rank: 1, percent: 50 }, { rank: 2, percent: 30 }, ...]
export const prizeTiers = pgTable("prize_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  minPlayers: integer("min_players").notNull(),
  maxPlayers: integer("max_players"),
  split: jsonb("split").notNull(),
  label: text("label").notNull(),
});

export type PrizeTier = typeof prizeTiers.$inferSelect;
export type NewPrizeTier = typeof prizeTiers.$inferInsert;
