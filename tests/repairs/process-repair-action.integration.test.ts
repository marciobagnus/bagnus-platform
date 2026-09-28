import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  processRepairAction,
  RepairActionConflictError,
} from "../../src/modules/repairs/application/process-repair-action.ts";

import {
  PrismaRepairStatusRepository,
} from "../../src/modules/repairs/infrastructure/prisma-repair-status-repository.ts";

const scenarios = [
  {
    name: "máquina reparada",
    resolution: "REPAIRED",
    initialStatus: "READY_FOR_PICKUP",
    expectedFinalStatus: "DELIVERED",
  },
  {
    name: "máquina devuelta sin reparar",
    initialStatus: "READY_FOR_PICKUP",
    resolution: "QUOTE_REJECTED",
    expectedFinalStatus: "DELIVERED",
  },
] as const;

test(
  "cierra ambos tipos de órdenes y permite un nuevo ingreso después de la entrega",
  async () => {
    const repository = new PrismaRepairStatusRepository();

    try {
      for (const scenario of scenarios) {
        const customerId = randomUUID();
        const machineId = randomUUID();
        const firstRepairId = randomUUID();
        const secondRepairId = randomUUID();

        const now = new Date();

        try {
          // 1. Crear datos exclusivos de este escenario.

          await prisma.customer.create({
            data: {
              id: customerId,
              name: "Cliente",
              lastName: "Prueba de entrega",
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
              id: firstRepairId,
              machineId,
              reportedIssue: "Reparación de prueba.",
              receivedAccessories: null,
              status: scenario.initialStatus,
              resolution: scenario.resolution,
              receivedAt: now,
              createdAt: now,
              updatedAt: now,
            },
          });

          // 2. Mientras la primera orden esté abierta,
          // PostgreSQL debe impedir otro ingreso
          // para la misma máquina.

          await assert.rejects(
            () =>
              prisma.repairOrder.create({
                data: {
                  id: randomUUID(),
                  machineId,
                  reportedIssue: "Segundo ingreso no permitido.",
                  status: "RECEIVED",
                  receivedAt: now,
                  createdAt: now,
                  updatedAt: now,
                },
              }),
          );

          const ordersBeforeDelivery =
            await prisma.repairOrder.count({
              where: { machineId },
            });

          assert.equal(ordersBeforeDelivery, 1);

          await prisma.repairQuote.create({
  data: {
    id: randomUUID(),
    repairOrderId: firstRepairId,
    version: 1,
    description: "Presupuesto de prueba de entrega.",
    totalAmount: "5000.00",
    status:
      scenario.resolution === "REPAIRED"
        ? "APPROVED"
        : "REJECTED",
    createdAt: now,
    updatedAt: now,
  },
});

          // 3. Registrar la entrega física de la máquina.

          const result = await processRepairAction(
            {
              repairId: firstRepairId,
              action: "HAND_OVER_MACHINE",
              note: "Entrega registrada en prueba de integración.",
            },
            repository,
          );

          assert.equal(
            result.previousStatus,
            scenario.initialStatus,
          );

          assert.equal(
            result.status,
            scenario.expectedFinalStatus,
          );

          // 4. Comprobar la orden y el historial.

          const savedRepair =
            await prisma.repairOrder.findUnique({
              where: { id: firstRepairId },
              include: {
                statusHistory: true,
              },
            });

          assert.ok(savedRepair);

          assert.equal(
            savedRepair.status,
            scenario.expectedFinalStatus,
          );

          assert.equal(savedRepair.statusHistory.length, 1);

          assert.equal(
            savedRepair.statusHistory[0].fromStatus,
            scenario.initialStatus,
          );

          assert.equal(
            savedRepair.statusHistory[0].toStatus,
            scenario.expectedFinalStatus,
          );

          // 5. No debe ser posible entregar
          // la misma orden una segunda vez.

          await assert.rejects(
            processRepairAction(
              {
                repairId: firstRepairId,
                action: "HAND_OVER_MACHINE",
              },
              repository,
            ),
            RepairActionConflictError,
          );

          assert.equal(
            await prisma.repairStatusHistory.count({
              where: { repairOrderId: firstRepairId },
            }),
            1,
          );

          // 6. Una vez cerrada la primera orden,
          // la misma máquina puede volver a ingresar.

          await prisma.repairOrder.create({
            data: {
              id: secondRepairId,
              machineId,
              reportedIssue: "Nuevo ingreso posterior a la entrega.",
              status: "RECEIVED",
              receivedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          const ordersAfterDelivery =
            await prisma.repairOrder.findMany({
              where: { machineId },
              orderBy: { receivedAt: "asc" },
            });

          assert.equal(ordersAfterDelivery.length, 2);

          const newRepair = ordersAfterDelivery.find(
            (repair) => repair.id === secondRepairId,
          );

          assert.ok(newRepair);
          assert.equal(newRepair.status, "RECEIVED");

          console.log(
            `Escenario aprobado: ${scenario.name}`,
          );
        } finally {
          // Eliminar exclusivamente los datos
          // pertenecientes a este escenario.

          const testRepairs =
            await prisma.repairOrder.findMany({
              where: { machineId },
              select: { id: true },
            });

          const repairIds = testRepairs.map(
            (repair) => repair.id,
          );

          await prisma.repairStatusHistory.deleteMany({
            where: {
              repairOrderId: { in: repairIds },
            },
          });

          await prisma.payment.deleteMany({
  where: { repairOrderId: { in: repairIds } },
});

await prisma.diagnosisCharge.deleteMany({
  where: { repairOrderId: { in: repairIds } },
});

await prisma.repairQuote.deleteMany({
  where: { repairOrderId: { in: repairIds } },
});

          await prisma.repairOrder.deleteMany({
            where: { machineId },
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
  },
);