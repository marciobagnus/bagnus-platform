import type { Payment } from "../domain/payment.ts";

export interface PaymentRepository {
  add(
    payment: Payment,
    recordedByUserId?: string | null,
  ): Promise<void>;
}