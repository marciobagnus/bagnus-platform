
import type { Machine } from "../domain/machine.ts";

export interface MachineListRepository {
  findByCustomerId(
    customerId: string,
  ): Promise<Machine[] | null>;
}