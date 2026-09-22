import { prisma } from "../../../lib/prisma.ts";

import type {
  DiagnosisCharge,
} from "../domain/diagnosis-charge.ts";

import type {
  DiagnosisChargeRepository,
} from "../application/diagnosis-charge-repository.ts";

export class DiagnosisRepairNotFoundError extends Error {
  constructor() {
    super("La reparación indicada no existe.");
    this.name = "DiagnosisRepairNotFoundError";
  }
}

export class DiagnosisDecisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagnosisDecisionConflictError";
  }
}

export class PrismaDiagnosisChargeRepository
  implements DiagnosisChargeRepository {

  async saveDecision(
  charge: DiagnosisCharge,
  decidedByUserId?: string | null,
): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Comprobar que la reparación existe.
      const repair = await tx.repairOrder.findUnique({
        where: {
          id: charge.repairOrderId,
        },
        select: {
          status: true,
          quotes: {
            where: {
              status: "REJECTED",
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

      if (repair === null) {
        throw new DiagnosisRepairNotFoundError();
      }

      // 2. La decisión solamente puede registrarse
      // cuando se rechazó el presupuesto y la máquina
      // todavía está pendiente de retiro.
      if (
        repair.status !== "AWAITING_PICKUP_UNREPAIRED" ||
        repair.quotes.length === 0
      ) {
        throw new DiagnosisDecisionConflictError(
          "Solo se puede decidir el cargo de diagnóstico de una reparación rechazada y pendiente de retiro.",
        );
      }

      // 3. Actualización condicional de la orden.
      // Bloquea su fila durante esta transacción y
      // vuelve a comprobar que el estado sea válido.
      const updated = await tx.repairOrder.updateMany({
        where: {
          id: charge.repairOrderId,
          status: "AWAITING_PICKUP_UNREPAIRED",
          quotes: {
            some: {
              status: "REJECTED",
            },
          },
        },
        data: {
          updatedAt: charge.decidedAt,
        },
      });

      if (updated.count !== 1) {
        throw new DiagnosisDecisionConflictError(
          "El estado de la reparación cambió. Volvé a consultar la orden.",
        );
      }

      // 4. Impedir una segunda decisión.
      const existing = await tx.diagnosisCharge.findUnique({
        where: {
          repairOrderId: charge.repairOrderId,
        },
        select: {
          id: true,
        },
      });

      if (existing !== null) {
        throw new DiagnosisDecisionConflictError(
          "La reparación ya tiene una decisión de diagnóstico registrada.",
        );
      }

      // 5. Guardar la decisión, no un pago.
      await tx.diagnosisCharge.create({
        data: {
          id: charge.id,
          repairOrderId: charge.repairOrderId,
          decision: charge.decision,
          amount: charge.amount,
          currency: charge.currency,
          note: charge.note,
          decidedAt: charge.decidedAt,
          decidedByUserId: decidedByUserId ?? null,
        },
      });
    });
  }
}