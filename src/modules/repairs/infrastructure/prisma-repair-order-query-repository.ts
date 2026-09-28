
import type {
  RepairOrderDetails,
  RepairOrderQueryRepository,
} from "../application/repair-order-query-repository.ts";

import { calculateRepairAccount } from "../../payments/domain/repair-account.ts";

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
                recordedBy: { select: { id: true, displayName: true } },
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
      billing: calculateRepairAccount(repair),
    } satisfies RepairOrderDetails;
  }
}
