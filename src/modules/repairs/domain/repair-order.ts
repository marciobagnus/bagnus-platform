
export type RepairStatus =
  | "RECEIVED"
  | "WAITING_APPROVAL"
  | "IN_REPAIR"
  | "READY_FOR_PICKUP"
  | "DELIVERED";

export type RepairResolution = "REPAIRED" | "QUOTE_REJECTED";
export type RepairHistoryStatus = RepairStatus | "DIAGNOSING" | "CANCELLED" | "AWAITING_PICKUP_UNREPAIRED";

export type RepairOrder = {
  id: string;
  machineId: string;

  reportedIssue: string;
  receivedAccessories: string | null;

  status: RepairStatus;
  resolution: RepairResolution | null;
  deliveredAt: Date | null;

  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type CreateRepairOrderInput = {
  id: string;
  machineId: string;

  reportedIssue: string;
  receivedAccessories?: string | null;

  now: Date;
};

export function createRepairOrder(
  input: CreateRepairOrderInput,
): RepairOrder {
  const machineId = input.machineId.trim();

  const reportedIssue = input.reportedIssue.trim();

  const receivedAccessories =
    input.receivedAccessories?.trim() || null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(machineId)) {
    throw new Error(
      "El identificador de la máquina no es válido.",
    );
  }

  if (reportedIssue.length === 0) {
    throw new Error(
      "La descripción del problema es obligatoria.",
    );
  }

  return {
    id: input.id,
    machineId,

    reportedIssue,
    receivedAccessories,

    status: "RECEIVED",
    resolution: null,
    deliveredAt: null,

    receivedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now,
  };
}