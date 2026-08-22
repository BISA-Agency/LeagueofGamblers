import { db } from "@/lib/db";
import { auditLog } from "@drizzle/schema";

export async function logAuditEvent(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  });
}
