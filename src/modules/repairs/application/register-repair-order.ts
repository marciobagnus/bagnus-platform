
import { randomUUID } from "node:crypto";

import {
  createRepairOrder,
} from "../domain/repair-order.ts";

import type {
  RepairOrder,
} from "../domain/repair-order.ts";

import type {
  RepairOrderRepository,
} from "./repair-order-repository.ts";

export type RegisterRepairOrderInput = {
  machineId: string;
  changedByUserId?: string | null;

  reportedIssue: string;
  receivedAccessories?: string | null;
};

export async function registerRepairOrder(
  input: RegisterRepairOrderInput,
  repository: RepairOrderRepository,
): Promise<RepairOrder> {
  const repairOrder = createRepairOrder({
    id: randomUUID(),

    machineId: input.machineId,

    reportedIssue: input.reportedIssue,

    receivedAccessories:
      input.receivedAccessories,

    now: new Date(),
  });

  await repository.add(repairOrder, input.changedByUserId ?? null);

  return repairOrder;
}