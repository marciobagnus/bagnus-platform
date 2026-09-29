import { randomUUID } from "node:crypto";
import type { Payment } from "../../payments/domain/payment.ts";
import { calculateRepairAccount, assertRepairPaymentAllowed } from "../../payments/domain/repair-account.ts";
import type { RepairStatus } from "../domain/repair-order.ts";
import type { RepairStatusChange } from "../domain/change-repair-status.ts";
import { RepairStatusConflictError, type RepairStatusRepository } from "../application/repair-status-repository.ts";
import { RepairActionConflictError } from "../application/process-repair-action.ts";
import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairStatusRepository implements RepairStatusRepository {
  async findCurrentStatus(repairId: string): Promise<RepairStatus | null> {
    const repair = await prisma.repairOrder.findUnique({
      where: { id: repairId }, select: { status: true },
    });
    return repair?.status ?? null;
  }

  async saveStatusChange(
    repairId: string,
    expectedStatus: RepairStatus,
    change: RepairStatusChange,
    changedByUserId?: string | null,
    payment?: Payment | null,
  ): Promise<void> {
    const finishing = expectedStatus === "IN_REPAIR" && change.toStatus === "READY_FOR_PICKUP";
    const delivering = expectedStatus === "READY_FOR_PICKUP" && change.toStatus === "DELIVERED";
    if (!finishing && !delivering) {
      throw new RepairActionConflictError("Usá la operación correspondiente del taller.");
    }

    await prisma.$transaction(async (tx) => {
      // All financial writers lock this same order before reading its account.
      await tx.$queryRaw`SELECT id FROM repair_orders WHERE id = ${repairId}::uuid FOR UPDATE`;
      const repair = await tx.repairOrder.findUnique({
        where: { id: repairId }, include: { quotes: true, payments: true },
      });
      if (!repair || repair.status !== expectedStatus) throw new RepairStatusConflictError();
      if (!calculateRepairAccount(repair).billingResolved) {
        throw new RepairActionConflictError("El presupuesto o la resolución no son consistentes con la operación.");
      }

      if (payment) {
        if (!delivering || payment.repairOrderId !== repairId) {
          throw new RepairActionConflictError("El pago no corresponde a esta entrega.");
        }
        try {
          assertRepairPaymentAllowed(repair, payment.amount);
        } catch (error) {
          throw new RepairActionConflictError(error instanceof Error ? error.message : "Pago inválido.");
        }
        await tx.payment.create({ data: { ...payment, recordedByUserId: changedByUserId ?? null } });
      }

      await tx.repairOrder.update({
        where: { id: repairId },
        data: {
          status: change.toStatus,
          resolution: finishing ? "REPAIRED" : repair.resolution,
          ...(delivering ? { deliveredAt: change.changedAt } : {}),
          updatedAt: change.changedAt,
        },
      });
      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(), repairOrderId: repairId,
          fromStatus: expectedStatus, toStatus: change.toStatus, note: change.note,
          changedAt: change.changedAt, changedByUserId: changedByUserId ?? null,
        },
      });
    });
  }
}
