
export type RepairQuoteStatus =
  | "DRAFT"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type RepairQuote = {
  id: string;
  repairOrderId: string;

  version: number;

  description: string;
  totalAmount: string;
  currency: "ARS";

  status: RepairQuoteStatus;

  createdAt: Date;
  updatedAt: Date;
};

type CreateRepairQuoteInput = {
  id: string;
  repairOrderId: string;

  version: number;
  description: string;
  totalAmount: string;

  now: Date;
};

export function createRepairQuote(
  input: CreateRepairQuoteInput,
): RepairQuote {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const repairOrderId = input.repairOrderId.trim();
  const description = input.description.trim();
  const totalAmount = input.totalAmount.trim();

  if (!uuidRegex.test(repairOrderId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new Error(
      "La versión del presupuesto no es válida.",
    );
  }

  if (description.length === 0) {
    throw new Error(
      "La descripción del presupuesto es obligatoria.",
    );
  }

  // Decimal(12,2): hasta 10 dígitos enteros y
  // hasta 2 decimales. Se exige un importe positivo.

  const amountRegex =
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

  if (
    !amountRegex.test(totalAmount) ||
    !/[1-9]/.test(totalAmount)
  ) {
    throw new Error(
      "El importe debe ser un valor positivo con hasta dos decimales.",
    );
  }

  return {
    id: input.id,
    repairOrderId,

    version: input.version,

    description,
    totalAmount,
    currency: "ARS",

    status: "DRAFT",

    createdAt: input.now,
    updatedAt: input.now,
  };
}