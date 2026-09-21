import type {
  CustomerSearchRepository,
  CustomerSearchResult,
} from "../application/customer-search-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class PrismaCustomerSearchRepository
  implements CustomerSearchRepository {

  async search(
    query: string,
    limit: number,
  ): Promise<CustomerSearchResult[]> {

    // Permite buscar un DNI escrito con puntos o espacios.
    const normalizedDni = query.replace(/[\s.]/g, "");

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            dni: {
              contains: normalizedDni,
            },
          },
          {
            phone: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        name: true,
        lastName: true,
        phone: true,
      },

      orderBy: [
        {
          lastName: "asc",
        },
        {
          name: "asc",
        },
      ],

      take: limit,
    });

    return customers;
  }
}