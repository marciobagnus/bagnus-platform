
import type { Machine } from "../domain/machine.ts";

export interface MachineRepository {
  add(machine: Machine): Promise<void>;
}