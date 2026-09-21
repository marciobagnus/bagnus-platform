
import type {
  RepairOrderDetails,
  RepairOrderQueryRepository,
} from "./repair-order-query-repository.ts";

export async function getRepairOrder(
  repairId: string,
  repository: RepairOrderQueryRepository,
): Promise<RepairOrderDetails | null> {
  const normalizedId = repairId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(normalizedId)) {
    throw new Error(
      "El identificador de la reparación no es válido.",
    );
  }

  return repository.findById(normalizedId);
}