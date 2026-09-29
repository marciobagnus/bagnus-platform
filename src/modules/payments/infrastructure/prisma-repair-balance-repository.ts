import { prisma } from "../../../lib/prisma.ts";
import type { RepairBalanceRepository } from "../application/get-repair-balance.ts";

export class PrismaRepairBalanceRepository implements RepairBalanceRepository {
  async findBillingData(repairOrderId: string) {
    return prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { quotes: true, payments: true },
    });
  }
}
