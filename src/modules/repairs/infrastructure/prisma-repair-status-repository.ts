import { randomUUID } from "node:crypto";
import type { RepairStatus } from "../domain/repair-order.ts";
import type { RepairStatusChange } from "../domain/change-repair-status.ts";
import type { RepairStatusRepository } from "../application/repair-status-repository.ts";
import { RepairStatusConflictError } from "../application/update-repair-status.ts";
import { RepairActionConflictError } from "../application/process-repair-action.ts";
import { calculateRepairAccount } from "../../payments/domain/repair-account.ts";
import { prisma } from "../../../lib/prisma.ts";

export class PrismaRepairStatusRepository implements RepairStatusRepository {
  async findCurrentStatus(repairId: string): Promise<RepairStatus | null> {
    return (await prisma.repairOrder.findUnique({where:{id:repairId}, select:{status:true}}))?.status ?? null;
  }
  async saveStatusChange(repairId: string, expectedStatus: RepairStatus, change: RepairStatusChange, changedByUserId?: string | null): Promise<void> {
    const finishing = expectedStatus === "IN_REPAIR" && change.toStatus === "READY_FOR_PICKUP";
    const delivering = expectedStatus === "READY_FOR_PICKUP" && change.toStatus === "DELIVERED";
    if (!finishing && !delivering) throw new RepairActionConflictError("Usá la operación correspondiente del taller.");
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM repair_orders WHERE id = ${repairId}::uuid FOR UPDATE`;
      const repair = await tx.repairOrder.findUnique({where:{id:repairId}, include:{quotes:true,payments:true}});
      if (!repair || repair.status !== expectedStatus) throw new RepairStatusConflictError();
      const account = calculateRepairAccount(repair);
      if (!account.billingResolved) throw new RepairActionConflictError("El presupuesto o la resolución no son consistentes con la operación.");
      await tx.repairOrder.update({where:{id:repairId},data:{
        status:change.toStatus,
        resolution:finishing ? "REPAIRED" : repair.resolution,
        ...(delivering ? {deliveredAt:change.changedAt} : {}),
        updatedAt:change.changedAt,
      }});
      await tx.repairStatusHistory.create({data:{id:randomUUID(),repairOrderId:repairId,
        fromStatus:expectedStatus,toStatus:change.toStatus,note:change.note,
        changedAt:change.changedAt,changedByUserId:changedByUserId ?? null,
      }});
    });
  }
}
