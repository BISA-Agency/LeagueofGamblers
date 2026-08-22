import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const xpEvents = pgTable("xp_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  // Polymorphic reference (e.g. refType "bet" + refId -> bets.id). Not a DB
  // FK since refType varies; validated at the application layer.
  refType: text("ref_type"),
  refId: uuid("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type XpEvent = typeof xpEvents.$inferSelect;
export type NewXpEvent = typeof xpEvents.$inferInsert;
