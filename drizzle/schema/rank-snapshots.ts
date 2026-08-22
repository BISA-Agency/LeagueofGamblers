import { date, integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const rankSnapshots = pgTable(
  "rank_snapshots",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    balance: money("balance").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [primaryKey({ columns: [table.challengeId, table.userId, table.date] })]
);

export type RankSnapshot = typeof rankSnapshots.$inferSelect;
export type NewRankSnapshot = typeof rankSnapshots.$inferInsert;
