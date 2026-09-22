import { prisma } from "../../../lib/prisma.ts";

import type { Payment } from "../domain/payment.ts";
import type { PaymentRepository } from "../application/payment-repository.ts";

export class PrismaPaymentRepository implements PaymentRepository {
  async add(payment: Payment): Promise<void> {
    await prisma.payment.create({
      data: {
        id: payment.id,
        repairOrderId: payment.repairOrderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        reference: payment.reference,
        note: payment.note,
        receivedAt: payment.receivedAt,
        createdAt: payment.createdAt,
      },
    });
  }
}