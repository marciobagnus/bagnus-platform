export const REPAIR_STATUS_LABELS = {
  RECEIVED: "Recibida",
  WAITING_APPROVAL: "Esperando aprobación",
  IN_REPAIR: "En reparación",
  READY_FOR_PICKUP: "Lista para retirar",
  DELIVERED: "Entregada",
} as const;

export type RepairStatus = keyof typeof REPAIR_STATUS_LABELS;

export function getRepairStatusLabel(
  status: string,
) {
  return (
    REPAIR_STATUS_LABELS[
      status as RepairStatus
    ] ?? ({ DIAGNOSING: "En diagnóstico (histórico)", CANCELLED: "Cancelada (histórico)", AWAITING_PICKUP_UNREPAIRED: "Retiro sin reparar (histórico)" } as Record<string,string>)[status] ?? status
  );
}