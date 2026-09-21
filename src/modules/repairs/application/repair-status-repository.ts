
import type {
  RepairStatus,
} from "../domain/repair-order.ts";

import type {
  RepairStatusChange,
} from "../domain/change-repair-status.ts";

export interface RepairStatusRepository {

  findCurrentStatus(
    repairId: string,
  ): Promise<RepairStatus | null>;

  saveStatusChange(
    repairId: string,
    expectedStatus: RepairStatus,
    change: RepairStatusChange,
  ): Promise<void>;

}