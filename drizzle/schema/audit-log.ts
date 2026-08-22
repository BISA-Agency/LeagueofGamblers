import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Null = system-triggered (e.g. a cron job), not a human admin action.
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
