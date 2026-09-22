import {
  changeRepairStatus,
} from "../../repairs/domain/change-repair-status";

import type {
  QuoteDecision,
  InternalDecisionChannel,
  QuoteDecisionRepository,
} from "./quote-decision-repository";

export class QuoteDecisionNotFoundError extends Error {
  constructor() {
    super("El presupuesto indicado no existe.");
    this.name = "QuoteDecisionNotFoundError";
  }
}

export class QuoteDecisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteDecisionConflictError";
  }
}

export type DecideRepairQuoteInput = {
  quoteId: string;
  decision: QuoteDecision;
  channel: InternalDecisionChannel;
  note?: string | null;
};

export async function decideRepairQuote(
  input: DecideRepairQuoteInput,
  repository: QuoteDecisionRepository,
) {
  const quoteId = input.quoteId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(quoteId)) {
    throw new Error(
      "El identificador del presupuesto no es válido.",
    );
  }

  const context = await repository.findById(quoteId);

  if (context === null) {
    throw new QuoteDecisionNotFoundError();
  }

  if (context.quoteStatus !== "WAITING_APPROVAL") {
    throw new QuoteDecisionConflictError(
      "El presupuesto no está pendiente de aprobación.",
    );
  }

  if (context.repairStatus !== "WAITING_APPROVAL") {
    throw new QuoteDecisionConflictError(
      "La reparación no está esperando la aprobación del presupuesto.",
    );
  }

  const nextRepairStatus =
    input.decision === "APPROVED"
      ? "IN_REPAIR"
      : "AWAITING_PICKUP_UNREPAIRED";

  const statusChange = changeRepairStatus({
    currentStatus: context.repairStatus,
    newStatus: nextRepairStatus,
    note:
      input.note?.trim() ||
      (input.decision === "APPROVED"
        ? "Presupuesto aprobado por el cliente."
        : "Presupuesto rechazado. Máquina pendiente de retiro."),
    now: new Date(),
  });

  await repository.saveDecision({
    quoteId: context.quoteId,
    repairOrderId: context.repairOrderId,
    decision: input.decision,
    channel: input.channel,
    note: input.note?.trim() || null,
    statusChange,
  });

  return {
    quoteId: context.quoteId,
    repairOrderId: context.repairOrderId,
    quoteStatus: input.decision,
    repairStatus: nextRepairStatus,
  };
}