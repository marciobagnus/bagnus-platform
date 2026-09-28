import { randomUUID } from "node:crypto";

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
    changedByUserId?: string | null,
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

      if (repair.status !== "RECEIVED") {
        throw new RepairQuoteConflictError(
          "La reparación debe estar en diagnóstico para crear el presupuesto.",
        );
      }

      const updated = await tx.repairOrder.updateMany({
        where: { id: quote.repairOrderId, status: "RECEIVED", resolution: null },
        data: { status: quote.status === "DRAFT" ? "RECEIVED" : "WAITING_APPROVAL", updatedAt: quote.createdAt },
      });
      if (updated.count !== 1) throw new RepairQuoteConflictError("La reparaci?n cambi? de estado.");

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

      if (quote.status === "WAITING_APPROVAL") {
        await tx.repairStatusHistory.create({ data: {
          id: randomUUID(), repairOrderId: quote.repairOrderId,
          fromStatus: "RECEIVED", toStatus: "WAITING_APPROVAL",
          note: "Presupuesto guardado y enviado a aprobaci?n.", changedAt: quote.createdAt,
          changedByUserId: changedByUserId ?? null,
        } });
      }

    });
  }
}