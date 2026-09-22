export type DiagnosisDecision = "CHARGED" | "WAIVED";

export type DiagnosisCharge = {
  id: string;
  repairOrderId: string;
  decision: DiagnosisDecision;
  amount: string;
  currency: "ARS";
  note: string | null;
  decidedAt: Date;
};

type CreateDiagnosisChargeInput = {
  id: string;
  repairOrderId: string;
  decision: DiagnosisDecision;
  amount?: string | null;
  note?: string | null;
  now: Date;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AMOUNT_REGEX =
  /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function createDiagnosisCharge(
  input: CreateDiagnosisChargeInput,
): DiagnosisCharge {
  const repairOrderId = input.repairOrderId.trim();

  if (!UUID_REGEX.test(repairOrderId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  let amount: string;

  if (input.decision === "CHARGED") {
    const rawAmount = input.amount?.trim() ?? "";

    if (
      !AMOUNT_REGEX.test(rawAmount) ||
      !/[1-9]/.test(rawAmount)
    ) {
      throw new Error(
        "El diagnóstico cobrado debe tener un importe positivo con hasta dos decimales.",
      );
    }

    const [whole, decimals = ""] = rawAmount.split(".");
    amount = `${whole}.${decimals.padEnd(2, "0")}`;
  } else if (input.decision === "WAIVED") {
    if (input.amount != null) {
      throw new Error(
        "Un diagnóstico condonado no debe tener un importe.",
      );
    }

    amount = "0.00";
  } else {
    throw new Error(
      "La decisión sobre el diagnóstico no es válida.",
    );
  }

  return {
    id: input.id,
    repairOrderId,
    decision: input.decision,
    amount,
    currency: "ARS",
    note: input.note?.trim() || null,
    decidedAt: input.now,
  };
}