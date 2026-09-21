
import type { Machine } from "../domain/machine.ts";

import type { MachineRepository } from "../application/machine-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaMachineRepository
  implements MachineRepository {

  async add(machine: Machine): Promise<void> {
    await prisma.machine.create({
      data: {
        id: machine.id,
        customerId: machine.customerId,
        brand: machine.brand,
        type: machine.type,
        model: machine.model,
        serialNumber: machine.serialNumber,
        createdAt: machine.createdAt,
        updatedAt: machine.updatedAt,
      },
    });
  }
}