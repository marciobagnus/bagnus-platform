export const REPAIR_STATUS_LABELS = {
  RECEIVED: "Recibida",
  WAITING_APPROVAL: "Esperando aprobación",
  IN_REPAIR: "En reparación",
  READY_FOR_PICKUP: "Lista para retirar",
  DELIVERED: "Entregada",
} as const;

export type RepairStatus = keyof typeof REPAIR_STATUS_LABELS;

const LEGACY_STATUS_LABELS: Record<string, string> = {
  DIAGNOSING: "En diagnóstico (histórico)",
  CANCELLED: "Cancelada (histórico)",
  AWAITING_PICKUP_UNREPAIRED: "Retiro sin reparar (histórico)",
};

export function getRepairStatusLabel(status: string, resolution?: string | null) {
  const label = REPAIR_STATUS_LABELS[status as RepairStatus] ?? LEGACY_STATUS_LABELS[status] ?? status;
  if (resolution === "REPAIRED") return `${label} — Reparada`;
  if (resolution === "QUOTE_REJECTED") return `${label} — Sin reparar`;
  return label;
}
