import type { Payment } from "../domain/payment.ts";

export interface PaymentRepository {
  add(payment: Payment): Promise<void>;
}