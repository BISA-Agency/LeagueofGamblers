import { db } from "@/lib/db";
import { notifications } from "@drizzle/schema";

export type NotificationType = "rank_update" | "mission_completed" | "new_follower";

export type NewNotificationInput = {
  userId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
};

export async function createNotification(input: NewNotificationInput) {
  await createNotifications([input]);
}

export async function createNotifications(inputs: NewNotificationInput[]) {
  if (inputs.length === 0) return;
  await db.insert(notifications).values(
    inputs.map((n) => ({ userId: n.userId, type: n.type, payload: n.payload ?? {} }))
  );
}
