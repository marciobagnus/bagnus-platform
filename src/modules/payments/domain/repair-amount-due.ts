export type RepairBillingSituation =
  | { kind: "PENDING_DECISION" }
  | {
      kind: "REPAIR_APPROVED";
      approvedQuoteAmount: string;
    }
  | {
      kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED";
      diagnosisAmount: string;
    }
  | {
      kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED";
    };

export type RepairAmountDue = {
  status: "PENDING" | "DETERMINED";
  totalAmount: string | null;
};

const AMOUNT_REGEX =
  /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function normalizePositiveAmount(value: string): string {
  const amount = value.trim();

  if (!AMOUNT_REGEX.test(amount) || !/[1-9]/.test(amount)) {
    throw new Error(
      "El importe a cobrar debe ser positivo y tener hasta dos decimales.",
    );
  }

  const [whole, decimals = ""] = amount.split(".");

  return `${whole}.${decimals.padEnd(2, "0")}`;
}

export function determineRepairAmountDue(
  situation: RepairBillingSituation,
): RepairAmountDue {
  switch (situation.kind) {
    case "PENDING_DECISION":
      return {
        status: "PENDING",
        totalAmount: null,
      };

    case "REPAIR_APPROVED":
      return {
        status: "DETERMINED",
        totalAmount: normalizePositiveAmount(
          situation.approvedQuoteAmount,
        ),
      };

    case "REPAIR_REJECTED_DIAGNOSIS_CHARGED":
      return {
        status: "DETERMINED",
        totalAmount: normalizePositiveAmount(
          situation.diagnosisAmount,
        ),
      };

    case "REPAIR_REJECTED_DIAGNOSIS_WAIVED":
      return {
        status: "DETERMINED",
        totalAmount: "0.00",
      };
  }
}