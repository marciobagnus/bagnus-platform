
import type {
  RepairOrderDetails,
  RepairOrderQueryRepository,
} from "../application/repair-order-query-repository.ts";

import {
  calculateRepairBalance,
} from "../../payments/domain/repair-balance.ts";

import {
  determineRepairAmountDue,
  type RepairBillingSituation,
} from "../../payments/domain/repair-amount-due.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairOrderQueryRepository
  implements RepairOrderQueryRepository {

  async findRecent(limit: number) {
    return prisma.repairOrder.findMany({
      take: limit,
      orderBy: {
        receivedAt: "desc",
      },
      include: {
        machine: {
          select: {
            id: true,
            brand: true,
            type: true,
            model: true,
            serialNumber: true,
            customer: {
              select: {
                id: true,
                name: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(
    repairId: string,
  ): Promise<RepairOrderDetails | null> {

    const repair = await prisma.repairOrder.findUnique({
      where: {
        id: repairId,
      },

      include: {
        quotes: {
          orderBy: {
            version: "desc",
          },
          include: {
            decisions: {
              select: {
                approved: true,
                channel: true,
                note: true,
                decidedAt: true,
              },
            },
          },
        },
        machine: {
          select: {
            id: true,
            brand: true,
            type: true,
            model: true,
            serialNumber: true,
            customer: {
              select: {
                id: true,
                name: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        payments: {
          orderBy: [
            { receivedAt: "asc" },
            { id: "asc" },
          ],
          include: {
            recordedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        diagnosisCharge: {
          include: {
            decidedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: [
            { changedAt: "asc" },
            { id: "asc" },
          ],
          include: {
            changedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (repair === null) {
      return null;
    }

    const quotedApproved = repair.quotes.find(
      (quote) => quote.status === "APPROVED",
    );

    const rejectedQuote = repair.quotes.some(
      (quote) => quote.status === "REJECTED",
    );

    const rejectedRepair =
      repair.status === "AWAITING_PICKUP_UNREPAIRED" ||
      repair.status === "CANCELLED";

    let situation: RepairBillingSituation = {
      kind: "PENDING_DECISION",
    };

    if (quotedApproved) {
      situation = {
        kind: "REPAIR_APPROVED",
        approvedQuoteAmount: quotedApproved.totalAmount.toFixed(2),
      };
    } else if (
      rejectedRepair &&
      rejectedQuote &&
      repair.diagnosisCharge?.decision === "CHARGED"
    ) {
      situation = {
        kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
        diagnosisAmount: repair.diagnosisCharge.amount.toFixed(2),
      };
    } else if (
      rejectedRepair &&
      rejectedQuote &&
      repair.diagnosisCharge?.decision === "WAIVED"
    ) {
      situation = {
        kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED",
      };
    }

    const amountDue = determineRepairAmountDue(situation);

    const totalPaid =
      amountDue.status === "DETERMINED"
        ? calculateRepairBalance({
            totalAmount: amountDue.totalAmount ?? "0.00",
            payments: repair.payments.map((payment) =>
              payment.amount.toFixed(2),
            ),
          }).paidAmount
        : "0.00";

    const balance =
      amountDue.status === "DETERMINED"
        ? calculateRepairBalance({
            totalAmount: amountDue.totalAmount ?? "0.00",
            payments: repair.payments.map((payment) =>
              payment.amount.toFixed(2),
            ),
          })
        : {
            totalAmount: "0.00",
            paidAmount: "0.00",
            outstandingAmount: null,
            creditAmount: "0.00",
          };

    const resolved = amountDue.status === "DETERMINED";

    return {
      ...repair,
      payments: repair.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        method: payment.method,
        reference: payment.reference,
        note: payment.note,
        receivedAt: payment.receivedAt,
        recordedBy: payment.recordedBy,
      })),
      diagnosisCharge: repair.diagnosisCharge
        ? {
            id: repair.diagnosisCharge.id,
            decision: repair.diagnosisCharge.decision,
            amount: repair.diagnosisCharge.amount.toFixed(2),
            currency: repair.diagnosisCharge.currency,
            note: repair.diagnosisCharge.note,
            decidedAt: repair.diagnosisCharge.decidedAt,
            decidedBy: repair.diagnosisCharge.decidedBy,
          }
        : null,
      billing: {
        amountDue: amountDue.totalAmount,
        totalPaid,
        outstandingBalance: resolved ? balance.outstandingAmount : null,
        currency: "ARS",
        billingResolved: resolved,
        hasOutstandingBalance: resolved
          ? balance.outstandingAmount !== "0.00"
          : false,
      },
    } satisfies RepairOrderDetails;
  }
}