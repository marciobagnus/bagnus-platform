
import type {
  RepairOrderDetails,
  RepairOrderQueryRepository,
} from "../application/repair-order-query-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairOrderQueryRepository
  implements RepairOrderQueryRepository {

  async findById(
    repairId: string,
  ): Promise<RepairOrderDetails | null> {

    const repair = await prisma.repairOrder.findUnique({
      where: {
        id: repairId,
      },

      include: {
        machine: {
          select: {
            id: true,
            brand: true,
            type: true,
            model: true,
            serialNumber: true,
          },
        },

        statusHistory: {
          orderBy: [
            { changedAt: "asc" },
            { id: "asc" },
          ],
        },
      },
    });

    if (repair === null) {
      return null;
    }

    return repair;
  }
}