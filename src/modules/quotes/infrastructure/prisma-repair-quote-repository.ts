
import type {
  RepairQuote,
} from "../domain/repair-quote.ts";

import type {
  RepairQuoteRepository,
} from "../application/repair-quote-repository.ts";

import { prisma } from "../../../lib/prisma.ts";

export class RepairQuoteNotFoundError extends Error {
  constructor() {
    super("La reparación indicada no existe.");
    this.name = "RepairQuoteNotFoundError";
  }
}

export class RepairQuoteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepairQuoteConflictError";
  }
}

export class PrismaRepairQuoteRepository
  implements RepairQuoteRepository {

  async addInitialDraft(
    quote: RepairQuote,
  ): Promise<void> {

    await prisma.$transaction(async (tx) => {

      // 1. Comprobar que la reparación existe.

      const repair = await tx.repairOrder.findUnique({
        where: {
          id: quote.repairOrderId,
        },

        select: {
          status: true,
        },
      });

      if (repair === null) {
        throw new RepairQuoteNotFoundError();
      }

      // 2. Solo se puede crear el presupuesto
      // inicial durante el diagnóstico.

      if (repair.status !== "DIAGNOSING") {
        throw new RepairQuoteConflictError(
          "La reparación debe estar en diagnóstico para crear el presupuesto.",
        );
      }

      // 3. Comprobar que no existan versiones
      // anteriores para esta reparación.

      const existingQuote = await tx.repairQuote.findFirst({
        where: {
          repairOrderId: quote.repairOrderId,
        },

        select: {
          id: true,
        },
      });

      if (existingQuote !== null) {
        throw new RepairQuoteConflictError(
          "La reparación ya tiene un presupuesto registrado.",
        );
      }

      // 4. Guardar el borrador inicial.

      await tx.repairQuote.create({
        data: {
          id: quote.id,
          repairOrderId: quote.repairOrderId,

          version: quote.version,

          description: quote.description,
          totalAmount: quote.totalAmount,
          currency: quote.currency,

          status: quote.status,

          createdAt: quote.createdAt,
          updatedAt: quote.updatedAt,
        },
      });

    });
  }
}