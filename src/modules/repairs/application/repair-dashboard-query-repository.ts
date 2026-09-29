import type { OutstandingRepairsSummary } from "./outstanding-repairs.ts";
import type { RepairStatus } from "../domain/repair-order.ts";

export const FINAL_REPAIR_STATUSES: RepairStatus[] = [
  "DELIVERED",
];

export type RepairDashboardItem = {
  id: string;
  status: RepairStatus;
  resolution: "REPAIRED" | "QUOTE_REJECTED" | null;
  reportedIssue: string;
  receivedAt: Date;
  updatedAt: Date;
  machine: {
    brand: string;
    type: string;
    model: string | null;
    customer: {
      id: string;
      name: string;
      lastName: string | null;
    };
  };
};

export type RepairDashboard = {
  activeRepairs: number;
  outstanding: OutstandingRepairsSummary;
  waitingApproval: number;
  readyForPickup: number;
  recentRepairs: RepairDashboardItem[];
};

export interface RepairDashboardQueryRepository {
  countActiveRepairs(): Promise<number>;

  countByStatus(status: RepairStatus): Promise<number>;

  findRecentActive(limit: number): Promise<RepairDashboardItem[]>;
}
