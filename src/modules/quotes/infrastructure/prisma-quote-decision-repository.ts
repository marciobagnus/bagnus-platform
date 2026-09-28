import { randomUUID } from "node:crypto";

import { prisma } from "../../../lib/prisma";

import type {
  QuoteDecisionRepository,
  QuoteDecisionContext,
  SaveQuoteDecisionInput,
} from "../application/quote-decision-repository";

import {
  QuoteDecisionConflictError,
} from "../application/decide-repair-quote";

export class PrismaQuoteDecisionRepository
  implements QuoteDecisionRepository {

  async findById(
    quoteId: string,
  ): Promise<QuoteDecisionContext | null> {

    const quote = await prisma.repairQuote.findUnique({
      where: {
        id: quoteId,
      },

      select: {
        id: true,
        repairOrderId: true,
        status: true,

        repairOrder: {
          select: {
            status: true,
          },
        },
      },
    });

    if (quote === null) {
      return null;
    }

    return {
      quoteId: quote.id,
      repairOrderId: quote.repairOrderId,
      quoteStatus: quote.status,
      repairStatus: quote.repairOrder.status,
    };
  }

  async saveDecision(
    input: SaveQuoteDecisionInput,
  ): Promise<void> {

    const {
      quoteId,
      repairOrderId,
      decision,
      channel,
      note,
      statusChange,
      changedByUserId,
    } = input;

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM repair_orders WHERE id = ${repairOrderId}::uuid FOR UPDATE`;


      // 1. Cambiar el presupuesto solamente
      // si sigue pendiente de aprobación.

      const quoteUpdate =
        await tx.repairQuote.updateMany({
          where: {
            id: quoteId,
            repairOrderId,
            status: "WAITING_APPROVAL",
          },

          data: {
            status: decision,
            updatedAt: statusChange.changedAt,
          },
        });

      if (quoteUpdate.count !== 1) {
        throw new QuoteDecisionConflictError(
          "El presupuesto ya fue modificado. Consultalo nuevamente.",
        );
      }

      // 2. Cambiar la reparación solamente
      // si sigue esperando aprobación.

      const repairUpdate =
        await tx.repairOrder.updateMany({
          where: {
            id: repairOrderId,
            status: "WAITING_APPROVAL",
          },

          data: {
            status: statusChange.toStatus,
            resolution: decision === "REJECTED" ? "QUOTE_REJECTED" : null,
            updatedAt: statusChange.changedAt,
          },
        });

      if (repairUpdate.count !== 1) {
        throw new QuoteDecisionConflictError(
          "La reparación ya fue modificada. Consultala nuevamente.",
        );
      }

      // 3. Registrar la decisión del cliente.

      await tx.quoteDecision.create({
        data: {
          id: randomUUID(),
          quoteId,
          approved: decision === "APPROVED",
          recordedByUserId: changedByUserId ?? null,
          channel,
          note,
          decidedAt: statusChange.changedAt,
        },
      });

      // 4. Registrar el cambio de estado
      // de la reparación.

      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),
          repairOrderId,

          fromStatus: statusChange.fromStatus,
          toStatus: statusChange.toStatus,

          note: statusChange.note,
          changedAt: statusChange.changedAt,
          changedByUserId: changedByUserId ?? null,
        },
      });

    });
  }
}