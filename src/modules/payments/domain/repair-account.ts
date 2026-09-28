import { calculateRepairBalance, assertPaymentWithinBalance } from "./repair-balance.ts";

export type RepairAccountSource = {
  status: string;
  resolution: string | null;
  quotes: readonly { status: string; totalAmount: { toString(): string } }[];
  payments: readonly { amount: { toString(): string } }[];
};

// A quote is the obligation; diagnosis decisions never participate in the new flow.
export function calculateRepairAccount(repair: RepairAccountSource) {
  const approved = repair.quotes.filter((quote) => quote.status === "APPROVED");
  const rejected = repair.quotes.some((quote) => quote.status === "REJECTED");
  let amountDue: string | null = null;
  if (approved.length === 1 && ["IN_REPAIR", "READY_FOR_PICKUP", "DELIVERED"].includes(repair.status)
    && (repair.status === "IN_REPAIR" ? repair.resolution === null : repair.resolution === "REPAIRED")) {
    amountDue = approved[0].totalAmount.toString();
  } else if (approved.length === 0 && rejected && repair.resolution === "QUOTE_REJECTED"
    && ["READY_FOR_PICKUP", "DELIVERED"].includes(repair.status)) {
    amountDue = "0.00";
  }
  const balance = calculateRepairBalance({
    totalAmount: amountDue ?? "0.00",
    payments: repair.payments.map((payment) => payment.amount.toString()),
  });
  const resolved = amountDue !== null;
  const financialStatus = !resolved ? "UNDETERMINED"
    : balance.outstandingAmount === "0.00" ? "PAID"
    : balance.paidAmount === "0.00" ? "PENDING" : "PARTIALLY_PAID";
  return {
    amountDue: resolved ? balance.totalAmount : null,
    totalPaid: balance.paidAmount,
    outstandingBalance: resolved ? balance.outstandingAmount : null,
    creditAmount: resolved ? balance.creditAmount : null,
    currency: "ARS" as const,
    billingResolved: resolved,
    hasOutstandingBalance: resolved && balance.outstandingAmount !== "0.00",
    financialStatus,
  };
}

export function assertRepairPaymentAllowed(repair: RepairAccountSource, amount: string) {
  const account = calculateRepairAccount(repair);
  if (!account.billingResolved || account.amountDue === null) {
    throw new Error("Todavía no está determinado el importe a cobrar.");
  }
  assertPaymentWithinBalance({
    totalAmount: account.amountDue,
    paidAmount: account.totalPaid,
    outstandingAmount: account.outstandingBalance!,
    creditAmount: account.creditAmount!,
  }, amount);
  return account;
}
