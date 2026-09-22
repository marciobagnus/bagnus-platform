
import type {
  RepairOrderDetails,
  RepairOrderQueryRepository,
} from "../application/repair-order-query-repository.ts";

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

    return repair;
  }
}