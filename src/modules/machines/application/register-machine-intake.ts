import { randomUUID } from "node:crypto";

import { createMachine } from "../domain/machine.ts";
import type { Machine } from "../domain/machine.ts";
import { createRepairOrder } from "../../repairs/domain/repair-order.ts";
import type { RepairOrder } from "../../repairs/domain/repair-order.ts";

export type RegisterMachineIntakeInput = {
  customerId: string;
  changedByUserId?: string | null;
  brand: string;
  type: string;
  model?: string | null;
  serialNumber?: string | null;
  reportedIssue: string;
  receivedAccessories?: string | null;
};

export interface MachineIntakeRepository {
  add(machine: Machine, repair: RepairOrder, changedByUserId?: string | null): Promise<void>;
}

export async function registerMachineIntake(
  input: RegisterMachineIntakeInput,
  repository: MachineIntakeRepository,
) {
  const now = new Date();
  const machine = createMachine({
    id: randomUUID(),
    customerId: input.customerId,
    brand: input.brand,
    type: input.type,
    model: input.model,
    serialNumber: input.serialNumber,
    now,
  });
  const repair = createRepairOrder({
    id: randomUUID(),
    machineId: machine.id,
    reportedIssue: input.reportedIssue,
    receivedAccessories: input.receivedAccessories,
    now,
  });

  await repository.add(machine, repair, input.changedByUserId ?? null);

  return { machine, repair };
}