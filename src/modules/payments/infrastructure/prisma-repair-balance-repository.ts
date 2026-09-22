import { prisma } from "../../../lib/prisma.ts";

import type {
  RepairBalanceRepository,
  RepairBillingData,
} from "../application/get-repair-balance.ts";

export class PrismaRepairBalanceRepository
  implements RepairBalanceRepository {

  async findBillingData(
    repairOrderId: string,
  ): Promise<RepairBillingData | null> {
    const repair = await prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: {
        quotes: {
          where: {
            status: { in: ["APPROVED", "REJECTED"] },
          },
        },
        diagnosisCharge: true,
        payments: true,
      },
    });

    if (!repair) return null;

    const payments = repair.payments.map(
      (payment) => payment.amount.toFixed(2),
    );

    const approvedQuote = repair.quotes.find(
      (quote) => quote.status === "APPROVED",
    );

    if (approvedQuote) {
      return {
        situation: {
          kind: "REPAIR_APPROVED",
          approvedQuoteAmount: approvedQuote.totalAmount.toFixed(2),
        },
        payments,
      };
    }

    const rejectedQuote = repair.quotes.some(
      (quote) => quote.status === "REJECTED",
    );

    const rejectedRepair =
      repair.status === "AWAITING_PICKUP_UNREPAIRED" ||
      repair.status === "CANCELLED";

    if (
      rejectedRepair &&
      rejectedQuote &&
      repair.diagnosisCharge?.decision === "CHARGED"
    ) {
      return {
        situation: {
          kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
          diagnosisAmount: repair.diagnosisCharge.amount.toFixed(2),
        },
        payments,
      };
    }

    if (
      rejectedRepair &&
      rejectedQuote &&
      repair.diagnosisCharge?.decision === "WAIVED"
    ) {
      return {
        situation: {
          kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED",
        },
        payments,
      };
    }

    return {
      situation: { kind: "PENDING_DECISION" },
      payments,
    };
  }
}