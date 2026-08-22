import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const predictions = pgTable(
  "predictions",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    predictedWinnerId: uuid("predicted_winner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.challengeId, table.userId] })]
);

export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
