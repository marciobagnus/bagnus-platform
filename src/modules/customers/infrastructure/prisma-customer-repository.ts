import type { Customer } from "../domain/customer.ts";

import type { CustomerRepository } from "../application/customer-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaCustomerRepository implements CustomerRepository {

  async add(customer: Customer): Promise<void> {

    await prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    });

  }

}