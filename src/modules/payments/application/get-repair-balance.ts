import {
  calculateRepairBalance,
} from "../domain/repair-balance.ts";

import {
  determineRepairAmountDue,
  type RepairBillingSituation,
} from "../domain/repair-amount-due.ts";

export type RepairBillingData = {
  situation: RepairBillingSituation;
  payments: string[];
};

export interface RepairBalanceRepository {
  findBillingData(
    repairOrderId: string,
  ): Promise<RepairBillingData | null>;
}

export async function getRepairBalance(
  repairOrderId: string,
  repository: RepairBalanceRepository,
) {
  const id = repairOrderId.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error("El identificador de la reparación no es válido.");
  }

  const data = await repository.findBillingData(id);

  if (!data) {
    throw new Error("La reparación indicada no existe.");
  }

  const amountDue = determineRepairAmountDue(data.situation);

  if (amountDue.status === "PENDING" || amountDue.totalAmount === null) {
    return {
      status: "PENDING" as const,
      totalAmount: null,
      paidAmount: null,
      outstandingAmount: null,
      creditAmount: null,
    };
  }

  return {
    status: "DETERMINED" as const,
    ...calculateRepairBalance({
      totalAmount: amountDue.totalAmount,
      payments: data.payments,
    }),
  };
}