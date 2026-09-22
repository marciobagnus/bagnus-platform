
import type {
  RepairOrder,
  RepairStatus,
} from "../domain/repair-order.ts";

export type RepairOrderPaymentSummary = {
  id: string;
  amount: string;
  currency: string;
  method: "CASH" | "TRANSFER" | "CARD" | "OTHER";
  reference: string | null;
  note: string | null;
  receivedAt: Date;
  recordedBy: {
    id: string;
    displayName: string;
  } | null;
};

export type RepairOrderDiagnosisSummary = {
  id: string;
  decision: "CHARGED" | "WAIVED";
  amount: string;
  currency: string;
  note: string | null;
  decidedAt: Date;
  decidedBy: {
    id: string;
    displayName: string;
  } | null;
};

export type RepairOrderBillingSummary = {
  amountDue: string | null;
  totalPaid: string;
  outstandingBalance: string | null;
  currency: string;
  billingResolved: boolean;
  hasOutstandingBalance: boolean;
};

export type RepairOrderDetails = RepairOrder & {
  quotes: {
    id: string;
    version: number;
    description: string;
    totalAmount: unknown;
    currency: string;
    status: string;
    createdAt: Date;
    decisions: {
      approved: boolean;
      channel: string;
      note: string | null;
      decidedAt: Date;
    }[];
  }[];

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

  billing: RepairOrderBillingSummary;
  payments: RepairOrderPaymentSummary[];
  diagnosisCharge: RepairOrderDiagnosisSummary | null;

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