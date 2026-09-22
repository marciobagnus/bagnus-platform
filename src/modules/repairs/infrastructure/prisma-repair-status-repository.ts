import { randomUUID } from "node:crypto";

import type { RepairStatus } from "../domain/repair-order.ts";
import type { RepairStatusChange } from "../domain/change-repair-status.ts";
import type { RepairStatusRepository } from "../application/repair-status-repository.ts";

import { RepairStatusConflictError } from "../application/update-repair-status.ts";
import { RepairActionConflictError } from "../application/process-repair-action.ts";

import {
  determineRepairAmountDue,
  type RepairBillingSituation,
} from "../../payments/domain/repair-amount-due.ts";

import {
  calculateRepairBalance,
} from "../../payments/domain/repair-balance.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairStatusRepository
  implements RepairStatusRepository {

  async findCurrentStatus(
    repairId: string,
  ): Promise<RepairStatus | null> {
    const repair = await prisma.repairOrder.findUnique({
      where: { id: repairId },
      select: { status: true },
    });

    return repair?.status ?? null;
  }

  async saveStatusChange(
    repairId: string,
    expectedStatus: RepairStatus,
    change: RepairStatusChange,
    changedByUserId?: string | null,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Actualizar primero bloquea la fila de la reparación.
      // Los cobros transaccionales también bloquean esa fila.
      const result = await tx.repairOrder.updateMany({
        where: {
          id: repairId,
          status: expectedStatus,
        },
        data: {
          status: change.toStatus,
          updatedAt: change.changedAt,
        },
      });

      if (result.count !== 1) {
        throw new RepairStatusConflictError();
      }

      const isHandover =
        change.toStatus === "DELIVERED" ||
        change.toStatus === "CANCELLED";

      if (isHandover) {
        const repair = await tx.repairOrder.findUniqueOrThrow({
          where: { id: repairId },
          select: {
            quotes: {
              where: {
                status: { in: ["APPROVED", "REJECTED"] },
              },
              select: {
                status: true,
                totalAmount: true,
              },
              orderBy: {
                version: "desc",
              },
            },
            diagnosisCharge: {
              select: {
                decision: true,
                amount: true,
              },
            },
            payments: {
              select: {
                amount: true,
              },
            },
          },
        });

        let situation: RepairBillingSituation = {
          kind: "PENDING_DECISION",
        };

        if (expectedStatus === "READY_FOR_PICKUP") {
          const approvedQuote = repair.quotes.find(
            (quote) => quote.status === "APPROVED",
          );

          if (approvedQuote) {
            situation = {
              kind: "REPAIR_APPROVED",
              approvedQuoteAmount:
                approvedQuote.totalAmount.toFixed(2),
            };
          }
        }

        if (expectedStatus === "AWAITING_PICKUP_UNREPAIRED") {
          const rejectedQuote = repair.quotes.some(
            (quote) => quote.status === "REJECTED",
          );

          if (rejectedQuote) {
            if (repair.diagnosisCharge?.decision === "CHARGED") {
              situation = {
                kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
                diagnosisAmount:
                  repair.diagnosisCharge.amount.toFixed(2),
              };
            }

            if (repair.diagnosisCharge?.decision === "WAIVED") {
              situation = {
                kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED",
              };
            }
          }
        }

        const amountDue = determineRepairAmountDue(situation);

        if (
          amountDue.status === "PENDING" ||
          amountDue.totalAmount === null
        ) {
          throw new RepairActionConflictError(
            "No se puede entregar la máquina: el importe a cobrar todavía no está determinado.",
          );
        }

        const balance = calculateRepairBalance({
          totalAmount: amountDue.totalAmount,
          payments: repair.payments.map(
            (payment) => payment.amount.toFixed(2),
          ),
        });

        if (balance.outstandingAmount !== "0.00") {
          throw new RepairActionConflictError(
            `No se puede entregar la máquina: queda un saldo pendiente de ARS ${balance.outstandingAmount}.`,
          );
        }
      }

      // Este historial se guarda únicamente si toda
      // la transacción, incluida la validación, tiene éxito.
      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),
          repairOrderId: repairId,
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          note: change.note,
          changedAt: change.changedAt,
          changedByUserId: changedByUserId ?? null,
        },
      });
    });
  }
}