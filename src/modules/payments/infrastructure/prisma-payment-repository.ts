import { prisma } from "../../../lib/prisma.ts";

import {
  calculateRepairBalance,
  assertPaymentWithinBalance,
} from "../domain/repair-balance.ts";

import type { Payment } from "../domain/payment.ts";
import type { PaymentRepository } from "../application/payment-repository.ts";

export class PaymentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConflictError";
  }
}

export class PrismaPaymentRepository implements PaymentRepository {
  async add(payment: Payment): Promise<void> {
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
        select: {
          status: true,
          quotes: {
            where: {
              status: { in: ["APPROVED", "REJECTED"] },
            },
            select: {
              status: true,
              totalAmount: true,
              version: true,
            },
            orderBy: { version: "desc" },
          },
          diagnosisCharge: {
            select: {
              decision: true,
              amount: true,
            },
          },
          payments: {
            select: { amount: true },
          },
        },
      });

      const approvedQuote = repair.quotes.find(
        (quote) => quote.status === "APPROVED",
      );

      let totalAmount: string | null = null;

      if (approvedQuote) {
        totalAmount = approvedQuote.totalAmount.toFixed(2);
      } else {
        const rejectedQuote = repair.quotes.some(
          (quote) => quote.status === "REJECTED",
        );

        const rejectedRepair =
          repair.status === "AWAITING_PICKUP_UNREPAIRED" ||
          repair.status === "CANCELLED";

        if (
          rejectedRepair &&
          rejectedQuote &&
          repair.diagnosisCharge
        ) {
          totalAmount =
            repair.diagnosisCharge.amount.toFixed(2);
        }
      }

      if (totalAmount === null) {
        throw new PaymentConflictError(
          "Todavía no está determinado el importe a cobrar.",
        );
      }

      const balance = calculateRepairBalance({
        totalAmount,
        payments: repair.payments.map(
          (existingPayment) =>
            existingPayment.amount.toFixed(2),
        ),
      });

      assertPaymentWithinBalance(balance, payment.amount);

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
        },
      });
    });
  }
}