import {
  FINAL_REPAIR_STATUSES,
} from "../application/repair-dashboard-query-repository.ts";

import type {
  RepairDashboardItem,
  RepairDashboardQueryRepository,
} from "../application/repair-dashboard-query-repository.ts";

import type {
  RepairStatus,
} from "../domain/repair-order.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairDashboardQueryRepository
  implements RepairDashboardQueryRepository {
  async countActiveRepairs() {
    return prisma.repairOrder.count({
      where: {
        status: {
          notIn: FINAL_REPAIR_STATUSES,
        },
      },
    });
  }

  async countByStatus(status: RepairStatus) {
    return prisma.repairOrder.count({
      where: { status },
    });
  }

  async findRecentActive(
    limit: number,
  ): Promise<RepairDashboardItem[]> {
    return prisma.repairOrder.findMany({
      where: {
        status: {
          notIn: FINAL_REPAIR_STATUSES,
        },
      },
      take: limit,
      orderBy: [
        { updatedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        status: true,
        reportedIssue: true,
        receivedAt: true,
        updatedAt: true,
        machine: {
          select: {
            brand: true,
            type: true,
            model: true,
            customer: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }
}
