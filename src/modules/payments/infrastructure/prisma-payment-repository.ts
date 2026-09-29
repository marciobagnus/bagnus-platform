import { prisma } from "../../../lib/prisma.ts";

import { assertRepairPaymentAllowed } from "../domain/repair-account.ts";

import type { Payment } from "../domain/payment.ts";
import type { PaymentRepository } from "../application/payment-repository.ts";

export class PaymentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConflictError";
  }
}

export class PrismaPaymentRepository implements PaymentRepository {
  async add(
  payment: Payment,
  recordedByUserId?: string | null,
): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Bloquear la reparación mientras calculamos el saldo
      // y registramos el pago.
      const lockedRepairs = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM repair_orders
        WHERE id = ${payment.repairOrderId}::uuid
        FOR UPDATE
      `;

      if (lockedRepairs.length !== 1) {
        throw new PaymentConflictError(
          "La reparación indicada no existe.",
        );
      }

      const repair = await tx.repairOrder.findUniqueOrThrow({
        where: { id: payment.repairOrderId },
        include: { quotes: true, payments: true },
      });
      assertRepairPaymentAllowed(repair, payment.amount);

      await tx.payment.create({
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
          recordedByUserId: recordedByUserId ?? null,
        },
      });
    });
  }
}