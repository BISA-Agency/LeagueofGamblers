"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { payments } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function confirmPayment(paymentId: string) {
  const admin = await requireAdmin();

  await db
    .update(payments)
    .set({ status: "confirmed", confirmedBy: admin.id, confirmedAt: new Date() })
    .where(eq(payments.id, paymentId));

  await logAuditEvent({
    actorId: admin.id,
    action: "payment.confirm",
    entityType: "payment",
    entityId: paymentId,
  });

  revalidatePath("/admin/payments");
}
