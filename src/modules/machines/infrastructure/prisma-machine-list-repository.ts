
import type { Machine } from "../domain/machine.ts";

import type { MachineListRepository } from "../application/machine-list-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaMachineListRepository
  implements MachineListRepository {

  async findByCustomerId(
    customerId: string,
  ): Promise<Machine[] | null> {

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },

      select: {
        machines: {
          orderBy: [
            { createdAt: "desc" },
            { id: "asc" },
          ],
        },
      },
    });

    if (customer === null) {
      return null;
    }

    return customer.machines;
  }
}