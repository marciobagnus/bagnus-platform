
import { randomUUID } from "node:crypto";

import type {
  RepairStatus,
} from "../domain/repair-order.ts";

import type {
  RepairStatusChange,
} from "../domain/change-repair-status.ts";

import type {
  RepairStatusRepository,
} from "../application/repair-status-repository.ts";

import {
  RepairStatusConflictError,
} from "../application/update-repair-status.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairStatusRepository
  implements RepairStatusRepository {

  async findCurrentStatus(
    repairId: string,
  ): Promise<RepairStatus | null> {

    const repair = await prisma.repairOrder.findUnique({
      where: {
        id: repairId,
      },

      select: {
        status: true,
      },
    });

    return repair?.status ?? null;
  }

  async saveStatusChange(
    repairId: string,
    expectedStatus: RepairStatus,
    change: RepairStatusChange,
  ): Promise<void> {

    await prisma.$transaction(async (tx) => {

      // 1. Actualizar solamente si la reparación
      // continúa en el estado que consultamos.

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

      // Si no se actualizó ninguna fila, significa
      // que el estado cambió o la orden ya no existe.

      if (result.count !== 1) {
        throw new RepairStatusConflictError();
      }

      // 2. Registrar el movimiento en el historial.

      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),

          repairOrderId: repairId,

          fromStatus: change.fromStatus,
          toStatus: change.toStatus,

          note: change.note,

          changedAt: change.changedAt,
        },
      });

    });
  }
}