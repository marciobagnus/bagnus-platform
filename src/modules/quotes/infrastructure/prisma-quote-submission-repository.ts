import { randomUUID } from "node:crypto";

import { prisma } from "../../../lib/prisma";

import type {
  QuoteSubmissionRepository,
  QuoteSubmissionContext,
  SaveQuoteSubmissionInput,
} from "../application/quote-submission-repository";

import {
  QuoteSubmissionConflictError,
} from "../application/submit-repair-quote";

export class PrismaQuoteSubmissionRepository
  implements QuoteSubmissionRepository {

  async findById(
    quoteId: string,
  ): Promise<QuoteSubmissionContext | null> {

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

  async saveSubmission(
    input: SaveQuoteSubmissionInput,
  ): Promise<void> {

    const {
      quoteId,
      repairOrderId,
      statusChange,
    } = input;

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM repair_orders WHERE id = ${repairOrderId}::uuid FOR UPDATE`;


      // 1. Actualizar el presupuesto solamente
      // si todavía está en DRAFT.

      const quoteUpdate =
        await tx.repairQuote.updateMany({
          where: {
            id: quoteId,
            repairOrderId,
            status: "DRAFT",
          },

          data: {
            status: "WAITING_APPROVAL",
            updatedAt: statusChange.changedAt,
          },
        });

      if (quoteUpdate.count !== 1) {
        throw new QuoteSubmissionConflictError(
          "El presupuesto cambió de estado. Consultalo nuevamente.",
        );
      }

      // 2. Actualizar la reparación solamente
      // si todavía está en RECEIVED.

      const repairUpdate =
        await tx.repairOrder.updateMany({
          where: {
            id: repairOrderId,
            status: "RECEIVED",
          },

          data: {
            status: "WAITING_APPROVAL",
            updatedAt: statusChange.changedAt,
          },
        });

      if (repairUpdate.count !== 1) {
        throw new QuoteSubmissionConflictError(
          "La reparación cambió de estado. Consultala nuevamente.",
        );
      }

      // 3. Registrar el movimiento en el historial.

      await tx.repairStatusHistory.create({
        data: {
          id: randomUUID(),

          repairOrderId,

          fromStatus: statusChange.fromStatus,
          toStatus: statusChange.toStatus,

          note: statusChange.note,

          changedAt: statusChange.changedAt,
          changedByUserId: input.changedByUserId ?? null,
        },
      });

    });
  }
}