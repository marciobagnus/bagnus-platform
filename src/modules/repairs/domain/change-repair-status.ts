
import type {
  RepairStatus,
} from "./repair-order.ts";

export type RepairStatusChange = {
  fromStatus: RepairStatus;
  toStatus: RepairStatus;
  note: string | null;
  changedAt: Date;
};

// Primera transición permitida.
// Ampliaremos este mapa al implementar
// el diagnóstico, los presupuestos y las entregas.

const allowedTransitions: Record<
  RepairStatus,
  readonly RepairStatus[]
> = {
  RECEIVED: ["DIAGNOSING"],

  DIAGNOSING: [],
  WAITING_APPROVAL: [],
  IN_REPAIR: [],
  READY_FOR_PICKUP: [],
  DELIVERED: [],
  CANCELLED: [],
};

type ChangeRepairStatusInput = {
  currentStatus: RepairStatus;
  newStatus: RepairStatus;
  note?: string | null;
  now: Date;
};

export function changeRepairStatus(
  input: ChangeRepairStatusInput,
): RepairStatusChange {

  const {
    currentStatus,
    newStatus,
    now,
  } = input;

  // Verificar que el estado de destino
  // sea uno de los estados conocidos.

  if (!(newStatus in allowedTransitions)) {
    throw new Error(
      "El estado de destino no es válido.",
    );
  }

  // Verificar que la transición esté permitida.

  const allowed =
    allowedTransitions[currentStatus];

  if (
    !allowed ||
    !allowed.includes(newStatus)
  ) {
    throw new Error(
      `No se permite cambiar de ${currentStatus} a ${newStatus}.`,
    );
  }

  // Normalizar la observación.

  const note =
    input.note?.trim() || null;

  return {
    fromStatus: currentStatus,
    toStatus: newStatus,
    note,
    changedAt: now,
  };
}