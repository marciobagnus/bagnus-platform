
import type {
  CustomerMachine,
  MachineListRepository,
} from "../application/machine-list-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaMachineListRepository
  implements MachineListRepository {

  async findByCustomerId(
    customerId: string,
  ): Promise<CustomerMachine[] | null> {

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
          include: {
            repairOrders: {
              where: {
                status: {
                  notIn: ["DELIVERED", "CANCELLED"],
                },
              },
              orderBy: {
                receivedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (customer === null) {
      return null;
    }

    return customer.machines.map((machine) => ({
      id: machine.id,
      customerId: machine.customerId,
      brand: machine.brand,
      type: machine.type,
      model: machine.model,
      serialNumber: machine.serialNumber,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
      openRepair: machine.repairOrders[0] ?? null,
    }));
  }
}