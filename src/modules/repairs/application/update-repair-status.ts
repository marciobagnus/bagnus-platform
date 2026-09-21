
import type {
  RepairStatus,
} from "../domain/repair-order.ts";

import {
  changeRepairStatus,
} from "../domain/change-repair-status.ts";

import type {
  RepairStatusRepository,
} from "./repair-status-repository.ts";

export class RepairNotFoundError extends Error {
  constructor() {
    super("La reparación indicada no existe.");
    this.name = "RepairNotFoundError";
  }
}

export class RepairStatusConflictError extends Error {
  constructor() {
    super(
      "La reparación fue modificada por otra operación. Consultá su estado actual e intentá nuevamente.",
    );

    this.name = "RepairStatusConflictError";
  }
}

export type UpdateRepairStatusInput = {
  repairId: string;
  newStatus: RepairStatus;
  note?: string | null;
};

export async function updateRepairStatus(
  input: UpdateRepairStatusInput,
  repository: RepairStatusRepository,
): Promise<void> {

  // 1. Validar el identificador de la reparación.

  const repairId = input.repairId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(repairId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  // 2. Obtener el estado actual.

  const currentStatus =
    await repository.findCurrentStatus(repairId);

  if (currentStatus === null) {
    throw new RepairNotFoundError();
  }

  // 3. Aplicar las reglas del dominio.

  const change = changeRepairStatus({
    currentStatus,
    newStatus: input.newStatus,
    note: input.note,
    now: new Date(),
  });

  // 4. Guardar el cambio y su historial.

  await repository.saveStatusChange(
    repairId,
    currentStatus,
    change,
  );
}