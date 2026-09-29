import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  decideRepairQuote,
  QuoteDecisionConflictError,
} from "../../src/modules/quotes/application/decide-repair-quote.ts";

import {
  PrismaQuoteDecisionRepository,
} from "../../src/modules/quotes/infrastructure/prisma-quote-decision-repository.ts";

const scenarios = [
  {
    name: "aprobación",
    decision: "APPROVED",
    channel: "IN_PERSON",
    expectedRepairStatus: "IN_REPAIR",
    approved: true,
  },
  {
    name: "rechazo",
    decision: "REJECTED",
    channel: "PHONE",
    expectedRepairStatus: "READY_FOR_PICKUP",
    approved: false,
  },
] as const;

test("registra aprobación y rechazo sin duplicar decisiones ni historial", async () => {
  const repository = new PrismaQuoteDecisionRepository();

  try {
    for (const scenario of scenarios) {
      // Cada escenario utiliza registros independientes.
      const customerId = randomUUID();
      const machineId = randomUUID();
      const repairId = randomUUID();
      const quoteId = randomUUID();

      const now = new Date();

      try {
        // 1. Preparar los datos de prueba.

        await prisma.customer.create({
          data: {
            id: customerId,
            name: "Cliente",
            lastName: `Prueba ${scenario.name}`,
            dni: null,
            phone: `351${randomInt(100000000, 1000000000)}`,
            email: null,
            address: null,
            createdAt: now,
            updatedAt: now,
          },
        });

        await prisma.machine.create({
          data: {
            id: machineId,
            customerId,
            brand: "Singer",
            type: "Recta",
            model: "Máquina de prueba",
            serialNumber: null,
            createdAt: now,
            updatedAt: now,
          },
        });

        await prisma.repairOrder.create({
          data: {
            id: repairId,
            machineId,
            reportedIssue: "Problema mecánico de prueba.",
            receivedAccessories: null,
            status: "WAITING_APPROVAL",
            receivedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        });

        await prisma.repairQuote.create({
          data: {
            id: quoteId,
            repairOrderId: repairId,
            version: 1,
            description: "Reparación de prueba.",
            totalAmount: "45000.00",
            currency: "ARS",
            status: "WAITING_APPROVAL",
            createdAt: now,
            updatedAt: now,
          },
        });

        // Simular el historial previo de la reparación.

        await prisma.repairStatusHistory.createMany({
          data: [
            {
              id: randomUUID(),
              repairOrderId: repairId,
              fromStatus: null,
              toStatus: "RECEIVED",
              note: "Ingreso de la máquina.",
              changedAt: new Date(now.getTime() - 3000),
            },
            {
              id: randomUUID(),
              repairOrderId: repairId,
              fromStatus: "RECEIVED",
              toStatus: "DIAGNOSING",
              note: "Inicio del diagnóstico.",
              changedAt: new Date(now.getTime() - 2000),
            },
            {
              id: randomUUID(),
              repairOrderId: repairId,
              fromStatus: "DIAGNOSING",
              toStatus: "WAITING_APPROVAL",
              note: "Presupuesto informado.",
              changedAt: new Date(now.getTime() - 1000),
            },
          ],
        });

        // 2. Registrar la decisión.

        const result = await decideRepairQuote(
          {
            quoteId,
            decision: scenario.decision,
            channel: scenario.channel,
            note: `Prueba de ${scenario.name}.`,
          },
          repository,
        );

        assert.equal(result.quoteStatus, scenario.decision);

        assert.equal(
          result.repairStatus,
          scenario.expectedRepairStatus,
        );

        // 3. Comprobar lo guardado en PostgreSQL.

        const [quote, repair, decisions, history] =
          await Promise.all([
            prisma.repairQuote.findUnique({
              where: { id: quoteId },
            }),

            prisma.repairOrder.findUnique({
              where: { id: repairId },
            }),

            prisma.quoteDecision.findMany({
              where: { quoteId },
            }),

            prisma.repairStatusHistory.findMany({
              where: { repairOrderId: repairId },
              orderBy: { changedAt: "asc" },
            }),
          ]);

        assert.ok(quote);
        assert.ok(repair);

        assert.equal(quote.status, scenario.decision);

        assert.equal(
          repair.status,
          scenario.expectedRepairStatus,
        );

        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].approved, scenario.approved);
        assert.equal(decisions[0].channel, scenario.channel);

        assert.equal(history.length, 4);

        const lastMovement = history[history.length - 1];

        assert.equal(
          lastMovement.fromStatus,
          "WAITING_APPROVAL",
        );

        assert.equal(
          lastMovement.toStatus,
          scenario.expectedRepairStatus,
        );

        // 4. Repetir la misma decisión debe fallar.

        await assert.rejects(
          decideRepairQuote(
            {
              quoteId,
              decision: scenario.decision,
              channel: scenario.channel,
            },
            repository,
          ),
          QuoteDecisionConflictError,
        );

        // 5. El intento rechazado no debe crear
        // una segunda decisión ni otro movimiento.

        assert.equal(
          await prisma.quoteDecision.count({
            where: { quoteId },
          }),
          1,
        );

        assert.equal(
          await prisma.repairStatusHistory.count({
            where: { repairOrderId: repairId },
          }),
          4,
        );

      } finally {
        // Eliminar solamente los registros creados
        // para este escenario, en orden de dependencias.

        await prisma.quoteDecision.deleteMany({
          where: { quoteId },
        });

        await prisma.repairStatusHistory.deleteMany({
          where: { repairOrderId: repairId },
        });

        await prisma.repairQuote.deleteMany({
          where: { id: quoteId },
        });

        await prisma.repairOrder.deleteMany({
          where: { id: repairId },
        });

        await prisma.machine.deleteMany({
          where: { id: machineId },
        });

        await prisma.customer.deleteMany({
          where: { id: customerId },
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }
});