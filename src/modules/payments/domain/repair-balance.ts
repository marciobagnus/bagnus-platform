type CalculateRepairBalanceInput = {
  totalAmount: string;
  payments: readonly string[];
};

export type RepairBalance = {
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  creditAmount: string;
};

const AMOUNT_REGEX =
  /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function toCents(amount: string): bigint {
  if (!AMOUNT_REGEX.test(amount)) {
    throw new Error(
      "El importe debe ser un valor no negativo con hasta dos decimales.",
    );
  }

  const [whole, decimal = ""] = amount.split(".");

  return (
    BigInt(whole) * 100n +
    BigInt(decimal.padEnd(2, "0") || "0")
  );
}

function fromCents(cents: bigint): string {
  const whole = cents / 100n;
  const decimal = (cents % 100n).toString().padStart(2, "0");

  return `${whole}.${decimal}`;
}

export function calculateRepairBalance(
  input: CalculateRepairBalanceInput,
): RepairBalance {
  const totalCents = toCents(input.totalAmount);

  let paidCents = 0n;

  for (const payment of input.payments) {
    const paymentCents = toCents(payment);

    if (paymentCents === 0n) {
      throw new Error(
        "Los pagos registrados deben tener un importe positivo.",
      );
    }

    paidCents += paymentCents;
  }

  const difference = totalCents - paidCents;

  return {
    totalAmount: fromCents(totalCents),
    paidAmount: fromCents(paidCents),
    outstandingAmount: fromCents(
      difference > 0n ? difference : 0n,
    ),
    creditAmount: fromCents(
      difference < 0n ? -difference : 0n,
    ),
  };
}

export function assertPaymentWithinBalance(
  balance: RepairBalance,
  newPaymentAmount: string,
): void {
  const paymentCents = toCents(newPaymentAmount);
  const outstandingCents = toCents(
    balance.outstandingAmount,
  );

  if (paymentCents === 0n) {
    throw new Error(
      "El importe del pago debe ser positivo.",
    );
  }

  if (paymentCents > outstandingCents) {
    throw new Error(
      "El pago supera el saldo pendiente de la reparación.",
    );
  }
}