import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@drizzle/schema";
import type { PaymentProvider, PaymentRequest, PaymentStatusResult } from "./types";

export class CashProvider implements PaymentProvider {
  async createPaymentRequest({
    amount,
    currency,
  }: {
    amount: number;
    currency: string;
    challengeId: string;
    userId: string;
  }): Promise<PaymentRequest> {
    return {
      instructions: `Leg €${amount.toFixed(2)} ${currency} contant of via tikkie in bij de organisator. De admin vinkt je inleg af zodra die binnen is.`,
    };
  }

  // Cash has no programmatic verification — always pending until an admin confirms it by hand.
  async verifyPayment(paymentId: string): Promise<PaymentStatusResult> {
    return this.getStatus(paymentId);
  }

  async getStatus(paymentId: string): Promise<PaymentStatusResult> {
    const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
    if (!payment) return { status: "pending" };
    return {
      status: payment.status,
      confirmedAt: payment.confirmedAt ?? undefined,
    };
  }
}
