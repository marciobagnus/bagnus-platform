import { randomUUID } from "node:crypto";

import { prisma } from "../../../lib/prisma.ts";
import type { Machine } from "../domain/machine.ts";
import type { RepairOrder } from "../../repairs/domain/repair-order.ts";
import type { MachineIntakeRepository } from "../application/register-machine-intake.ts";

export class PrismaMachineIntakeRepository
  implements MachineIntakeRepository {
  async add(machine: Machine, repair: RepairOrder, changedByUserId?: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.machine.create({
        data: {
          id: machine.id,
          customerId: machine.customerId,
          brand: machine.brand,
          type: machine.type,
          model: machine.model,
          serialNumber: machine.serialNumber,
          createdAt: machine.createdAt,
          updatedAt: machine.updatedAt,
        },
      });

      await tx.repairOrder.create({
        data: {
          id: repair.id,
          machineId: repair.machineId,
          reportedIssue: repair.reportedIssue,
          receivedAccessories: repair.receivedAccessories,
          status: repair.status,
          receivedAt: repair.receivedAt,
          createdAt: repair.createdAt,
          updatedAt: repair.updatedAt,
        },
      });

      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),
          repairOrderId: repair.id,
          fromStatus: null,
          changedByUserId: changedByUserId ?? null,
          toStatus: repair.status,
          note: "Ingreso de la máquina al taller.",
          changedAt: repair.receivedAt,
        },
      });
    });
  }
}