
import type { Machine } from "../domain/machine.ts";

import type { MachineListRepository } from "./machine-list-repository.ts";

export async function listCustomerMachines(
  customerId: string,
  repository: MachineListRepository,
): Promise<Machine[] | null> {
  const normalizedId = customerId.trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(normalizedId)) {
    throw new Error(
      "El identificador del cliente no es válido.",
    );
  }

  return repository.findByCustomerId(normalizedId);
}