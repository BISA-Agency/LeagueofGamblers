export type PaymentRequest = {
  instructions: string;
  reference?: string;
};

export type PaymentStatusResult = {
  status: "pending" | "confirmed" | "rejected";
  confirmedAt?: Date;
};

export interface PaymentProvider {
  createPaymentRequest(params: {
    amount: number;
    currency: string;
    challengeId: string;
    userId: string;
  }): Promise<PaymentRequest>;
  /** Cash has no automatic verification — an admin confirms manually. Fase 3's CryptoProvider checks a tx hash here instead. */
  verifyPayment(paymentId: string): Promise<PaymentStatusResult>;
  getStatus(paymentId: string): Promise<PaymentStatusResult>;
}
