export type PaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "CARD"
  | "OTHER";

export type Payment = {
  id: string;
  repairOrderId: string;
  amount: string;
  currency: "ARS";
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receivedAt: Date;
  createdAt: Date;
};

type CreatePaymentInput = {
  id: string;
  repairOrderId: string;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
  now: Date;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AMOUNT_REGEX =
  /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function createPayment(
  input: CreatePaymentInput,
): Payment {
  const repairOrderId = input.repairOrderId.trim();
  const amount = input.amount.trim();

  if (!UUID_REGEX.test(repairOrderId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  if (
    !AMOUNT_REGEX.test(amount) ||
    !/[1-9]/.test(amount)
  ) {
    throw new Error(
      "El importe del pago debe ser positivo y tener hasta dos decimales.",
    );
  }

  const validMethods: PaymentMethod[] = [
    "CASH",
    "TRANSFER",
    "CARD",
    "OTHER",
  ];

  if (!validMethods.includes(input.method)) {
    throw new Error(
      "El medio de pago no es válido.",
    );
  }

  return {
    id: input.id,
    repairOrderId,
    amount,
    currency: "ARS",
    method: input.method,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    receivedAt: input.now,
    createdAt: input.now,
  };
}