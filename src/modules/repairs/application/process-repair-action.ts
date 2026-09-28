import { randomUUID } from "node:crypto";
import { createPayment, type PaymentMethod } from "../../payments/domain/payment.ts";

export class RepairActionInputError extends Error {}


import {
  changeRepairStatus,
} from "../domain/change-repair-status.ts";

import type {
  RepairStatus,
} from "../domain/repair-order";

import type {
  RepairStatusRepository,
} from "./repair-status-repository";

export type RepairAction =
  | "FINISH_REPAIR"
  | "HAND_OVER_MACHINE";

export class RepairActionNotFoundError extends Error {
  constructor() {
    super("La reparación indicada no existe.");
    this.name = "RepairActionNotFoundError";
  }
}

export class RepairActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepairActionConflictError";
  }
}

export type ProcessRepairActionInput = {
  repairId: string;
  action: RepairAction;
  note?: string | null;
  payment?: { amount: string; method: PaymentMethod; reference?: string | null; note?: string | null };
  changedByUserId?: string | null;
};

export async function processRepairAction(
  input: ProcessRepairActionInput,
  repository: RepairStatusRepository,
) {
  const repairId = input.repairId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(repairId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  let payment = null;
  if (input.payment) {
    if (input.action !== "HAND_OVER_MACHINE") throw new RepairActionInputError("El pago simultáneo solo corresponde a la entrega.");
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(input.payment.amount)) {
      throw new RepairActionInputError("El importe debe ser cero o positivo, con hasta dos decimales.");
    }
    if (/[1-9]/.test(input.payment.amount)) {
      try {
        payment = createPayment({ ...input.payment, id: randomUUID(), repairOrderId: repairId, now: new Date() });
      } catch (error) {
        throw new RepairActionInputError(error instanceof Error ? error.message : "Pago inválido.");
      }
    }
  }

  const currentStatus =
    await repository.findCurrentStatus(repairId);

  if (currentStatus === null) {
    throw new RepairActionNotFoundError();
  }

  let nextStatus: RepairStatus;
  let defaultNote: string;

  if (input.action === "FINISH_REPAIR") {
    // Finalizar un trabajo solo es posible
    // cuando la reparación está en curso.

    if (currentStatus !== "IN_REPAIR") {
      throw new RepairActionConflictError(
        "Solamente se puede finalizar una reparación en curso.",
      );
    }

    nextStatus = "READY_FOR_PICKUP";
    defaultNote =
      "Reparación finalizada. Máquina pendiente de retiro.";

  } else if (input.action === "HAND_OVER_MACHINE") {
    // La entrega depende de si la máquina
    // fue reparada o si el cliente rechazó
    // el presupuesto.

    if (currentStatus === "READY_FOR_PICKUP") {
      nextStatus = "DELIVERED";
      defaultNote =
        "Máquina entregada al cliente.";

    } else {
      throw new RepairActionConflictError(
        "La máquina no se encuentra pendiente de retiro.",
      );
    }

  } else {
    throw new Error(
      "La operación solicitada no es válida.",
    );
  }

  // Validar también la transición mediante
  // las reglas existentes del dominio.

  const statusChange = changeRepairStatus({
    currentStatus,
    newStatus: nextStatus,
    note: input.note?.trim() || defaultNote,
    now: new Date(),
  });

  // El repositorio comprueba el estado anterior
  // y actualiza reparación e historial dentro
  // de una misma transacción.

  await repository.saveStatusChange(
    repairId,
    currentStatus,
    statusChange,
    input.changedByUserId ?? null,
    payment,
  );

  return {
    repairId,
    action: input.action,
    previousStatus: currentStatus,
    status: nextStatus,
  };
}