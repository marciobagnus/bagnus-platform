export const REPAIR_STATUS_LABELS = {
  RECEIVED: "Recibida",
  DIAGNOSING: "En diagnóstico",
  WAITING_APPROVAL: "Esperando aprobación",
  IN_REPAIR: "En reparación",
  READY_FOR_PICKUP: "Lista para entregar",
  AWAITING_PICKUP_UNREPAIRED: "Retiro sin reparar",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
} as const;

export type RepairStatus = keyof typeof REPAIR_STATUS_LABELS;

export function getRepairStatusLabel(
  status: string,
) {
  return (
    REPAIR_STATUS_LABELS[
      status as RepairStatus
    ] ?? status
  );
}