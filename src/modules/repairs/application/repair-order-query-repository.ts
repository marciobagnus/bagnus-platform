
import type {
  RepairOrder,
  RepairStatus,
} from "../domain/repair-order.ts";

export type RepairOrderDetails = RepairOrder & {
  machine: {
    id: string;
    brand: string;
    type: string;
    model: string | null;
    serialNumber: string | null;
  };

  statusHistory: {
    id: string;
    fromStatus: RepairStatus | null;
    toStatus: RepairStatus;
    note: string | null;
    changedAt: Date;
  }[];
};

export interface RepairOrderQueryRepository {
  findById(
    repairId: string,
  ): Promise<RepairOrderDetails | null>;
}