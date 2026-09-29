import { calculateRepairAccount, type RepairAccountSource } from "../domain/repair-account.ts";
export type RepairBillingData = RepairAccountSource;

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

  const account = calculateRepairAccount(data);
  return {
    status: account.billingResolved ? "DETERMINED" as const : "PENDING" as const,
    totalAmount: account.amountDue,
    paidAmount: account.totalPaid,
    outstandingAmount: account.outstandingBalance,
    creditAmount: account.creditAmount,
  };
}
