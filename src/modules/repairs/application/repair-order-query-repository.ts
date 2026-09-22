
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
    customer: {
      id: string;
      name: string;
      lastName: string | null;
      phone: string;
    };
  };

  statusHistory: {
    id: string;
    fromStatus: RepairStatus | null;
    toStatus: RepairStatus;
    note: string | null;
    changedAt: Date;
    changedBy: {
      id: string;
      displayName: string;
    } | null;
  }[];
};

export type RepairOrderListItem = RepairOrder & {
  machine: RepairOrderDetails["machine"];
};

export interface RepairOrderQueryRepository {
  findRecent(limit: number): Promise<RepairOrderListItem[]>;

  findById(
    repairId: string,
  ): Promise<RepairOrderDetails | null>;
}