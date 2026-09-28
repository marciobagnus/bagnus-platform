import type { Payment } from "../../payments/domain/payment.ts";

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
    changedByUserId?: string | null,
    payment?: Payment | null,
  ): Promise<void>;

}