import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  processRepairAction,
  RepairActionConflictError,
} from "../../src/modules/repairs/application/process-repair-action.ts";

import {
  PrismaRepairStatusRepository,
} from "../../src/modules/repairs/infrastructure/prisma-repair-status-repository.ts";

const repository = new PrismaRepairStatusRepository();

const scenarios = [
  {
    name: "reparación aprobada con deuda",
    status: "READY_FOR_PICKUP",
    quoteStatus: "APPROVED",
    diagnosis: "NONE",
    expectedMessage: /saldo pendiente/,
  },
  {
    name: "reparación rechazada con diagnóstico impago",
    status: "AWAITING_PICKUP_UNREPAIRED",
    quoteStatus: "REJECTED",
    diagnosis: "CHARGED",
    expectedMessage: /saldo pendiente/,
  },
  {
    name: "reparación rechazada sin decisión de diagnóstico",
    status: "AWAITING_PICKUP_UNREPAIRED",
    quoteStatus: "REJECTED",
    diagnosis: "NONE",
    expectedMessage: /importe a cobrar todavía no está determinado/,
  },
] as const;

for (const scenario of scenarios) {
  test(`impide entregar una ${scenario.name}`, async () => {
    const customerId = randomUUID();
    const machineId = randomUUID();
    const repairOrderId = randomUUID();
    const now = new Date();

    try {
      await prisma.customer.create({
        data: {
          id: customerId,
          name: "Cliente",
          phone: `test-${customerId}`,
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
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.repairOrder.create({
        data: {
          id: repairOrderId,
          machineId,
          reportedIssue: "Prueba de entrega con saldo.",
          status: scenario.status,
          receivedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.repairQuote.create({
        data: {
          id: randomUUID(),
          repairOrderId,
          version: 1,
          description: "Presupuesto de prueba.",
          totalAmount: "5000.00",
          status: scenario.quoteStatus,
          createdAt: now,
          updatedAt: now,
        },
      });

      if (scenario.diagnosis === "CHARGED") {
        await prisma.diagnosisCharge.create({
          data: {
            id: randomUUID(),
            repairOrderId,
            decision: "CHARGED",
            amount: "2000.00",
            decidedAt: now,
          },
        });
      }

      await assert.rejects(
        processRepairAction(
          {
            repairId: repairOrderId,
            action: "HAND_OVER_MACHINE",
          },
          repository,
        ),
        (error: unknown) => {
          assert.ok(error instanceof RepairActionConflictError);
          assert.match(error.message, scenario.expectedMessage);
          return true;
        },
      );

      const savedRepair = await prisma.repairOrder.findUniqueOrThrow({
        where: { id: repairOrderId },
        include: { statusHistory: true },
      });

      assert.equal(savedRepair.status, scenario.status);
      assert.equal(savedRepair.statusHistory.length, 0);
    } finally {
      await prisma.payment.deleteMany({
        where: { repairOrderId },
      });

      await prisma.diagnosisCharge.deleteMany({
        where: { repairOrderId },
      });

      await prisma.repairQuote.deleteMany({
        where: { repairOrderId },
      });

      await prisma.repairStatusHistory.deleteMany({
        where: { repairOrderId },
      });

      await prisma.repairOrder.deleteMany({
        where: { id: repairOrderId },
      });

      await prisma.machine.deleteMany({
        where: { id: machineId },
      });

      await prisma.customer.deleteMany({
        where: { id: customerId },
      });
    }
  });
}

after(async () => {
  await prisma.$disconnect();
});