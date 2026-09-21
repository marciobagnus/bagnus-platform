
import { randomUUID } from "node:crypto";

import type { RepairOrder } from "../domain/repair-order.ts";

import type { RepairOrderRepository } from "../application/repair-order-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairOrderRepository
  implements RepairOrderRepository {

  async add(repairOrder: RepairOrder): Promise<void> {

    await prisma.$transaction(async (tx) => {

      // 1. Guardar la orden de reparación.

      await tx.repairOrder.create({
        data: {
          id: repairOrder.id,
          machineId: repairOrder.machineId,

          reportedIssue: repairOrder.reportedIssue,

          receivedAccessories:
            repairOrder.receivedAccessories,

          status: repairOrder.status,

          receivedAt: repairOrder.receivedAt,
          createdAt: repairOrder.createdAt,
          updatedAt: repairOrder.updatedAt,
        },
      });

      // 2. Registrar el primer movimiento del historial.

      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),

          repairOrderId: repairOrder.id,

          fromStatus: null,
          toStatus: repairOrder.status,

          note: "Ingreso de la máquina al taller.",

          changedAt: repairOrder.receivedAt,
        },
      });

    });
  }
}