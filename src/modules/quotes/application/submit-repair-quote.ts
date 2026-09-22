import {
  changeRepairStatus,
} from "../../repairs/domain/change-repair-status";

import type {
  QuoteSubmissionRepository,
} from "./quote-submission-repository";

export class QuoteSubmissionNotFoundError extends Error {
  constructor() {
    super("El presupuesto indicado no existe.");
    this.name = "QuoteSubmissionNotFoundError";
  }
}

export class QuoteSubmissionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteSubmissionConflictError";
  }
}

export type SubmitRepairQuoteInput = {
  quoteId: string;
  note?: string | null;
  changedByUserId?: string | null;
};

export async function submitRepairQuote(
  input: SubmitRepairQuoteInput,
  repository: QuoteSubmissionRepository,
) {
  const quoteId = input.quoteId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(quoteId)) {
    throw new Error(
      "El identificador del presupuesto no es válido.",
    );
  }

  // 1. Consultar el presupuesto y su reparación.

  const context = await repository.findById(quoteId);

  if (context === null) {
    throw new QuoteSubmissionNotFoundError();
  }

  // 2. El presupuesto debe seguir siendo un borrador.

  if (context.quoteStatus !== "DRAFT") {
    throw new QuoteSubmissionConflictError(
      "Solamente se puede informar un presupuesto en borrador.",
    );
  }

  // 3. La reparación debe continuar en diagnóstico.

  if (context.repairStatus !== "DIAGNOSING") {
    throw new QuoteSubmissionConflictError(
      "La reparación debe estar en diagnóstico para informar el presupuesto.",
    );
  }

  // 4. Validar el cambio mediante las reglas del dominio.

  const statusChange = changeRepairStatus({
    currentStatus: context.repairStatus,
    newStatus: "WAITING_APPROVAL",
    note:
      input.note ??
      "Presupuesto informado al cliente.",
    now: new Date(),
  });

  // 5. Guardar todos los cambios en una transacción.

  await repository.saveSubmission({
    quoteId: context.quoteId,
    repairOrderId: context.repairOrderId,
    statusChange,
    changedByUserId: input.changedByUserId,
  });

  return {
    quoteId: context.quoteId,
    repairOrderId: context.repairOrderId,
    quoteStatus: "WAITING_APPROVAL" as const,
    repairStatus: "WAITING_APPROVAL" as const,
  };
}