import { randomUUID } from "node:crypto";

import {
  createPayment,
  type Payment,
  type PaymentMethod,
} from "../domain/payment.ts";

import type {
  PaymentRepository,
} from "./payment-repository.ts";

export type RegisterPaymentInput = {
  repairOrderId: string;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
  recordedByUserId?: string | null;
};

export async function registerPayment(
  input: RegisterPaymentInput,
  repository: PaymentRepository,
): Promise<Payment> {
  const payment = createPayment({
    id: randomUUID(),
    repairOrderId: input.repairOrderId,
    amount: input.amount,
    method: input.method,
    reference: input.reference,
    note: input.note,
    now: new Date(),
  });

  await repository.add(
  payment,
  input.recordedByUserId ?? null,
);

  return payment;
}