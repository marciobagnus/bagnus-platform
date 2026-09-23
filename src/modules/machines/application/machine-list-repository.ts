
import type { Machine } from "../domain/machine.ts";

export type OpenRepairSummary = {
  id: string;
  status: string;
};

export type CustomerMachine = Machine & {
  openRepair: OpenRepairSummary | null;
};

export interface MachineListRepository {
  findByCustomerId(
    customerId: string,
  ): Promise<CustomerMachine[] | null>;
}