
import { randomUUID } from "node:crypto";

import {
  createMachine,
} from "../domain/machine.ts";

import type {
  Machine,
} from "../domain/machine.ts";

import type {
  MachineRepository,
} from "./machine-repository.ts";

export type RegisterMachineInput = {
  customerId: string;

  brand: string;
  type: string;
  model?: string | null;
  serialNumber?: string | null;
};

export async function registerMachine(
  input: RegisterMachineInput,
  repository: MachineRepository,
): Promise<Machine> {

  const machine = createMachine({
    id: randomUUID(),

    customerId: input.customerId,

    brand: input.brand,
    type: input.type,
    model: input.model,
    serialNumber: input.serialNumber,

    now: new Date(),
  });

  await repository.add(machine);

  return machine;
}