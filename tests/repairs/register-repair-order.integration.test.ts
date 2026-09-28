
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { registerMachine } from "../../src/modules/machines/application/register-machine.ts";

import { registerRepairOrder } from "../../src/modules/repairs/application/register-repair-order.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { PrismaMachineRepository } from "../../src/modules/machines/infrastructure/prisma-machine-repository.ts";

import { PrismaRepairOrderRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-order-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("registra una reparación y su historial en PostgreSQL", async () => {

  const customerRepository =
    new PrismaCustomerRepository();

  const machineRepository =
    new PrismaMachineRepository();

  const repairRepository =
    new PrismaRepairOrderRepository();

  let customerId: string | undefined;
  let machineId: string | undefined;

  try {

    // 1. Crear un cliente exclusivo para la prueba.

    const customer = await registerCustomer(
      {
        name: "Cliente",
        lastName: "Prueba Reparaciones",

        dni: randomInt(10000000, 100000000).toString(),

        phone:
          `351${Date.now()}${randomInt(100000, 999999)}`,
      },
      customerRepository,
    );

    customerId = customer.id;

    // 2. Registrar una máquina del cliente.

    const machine = await registerMachine(
      {
        customerId: customer.id,

        brand: "Singer",
        type: "Recta",

        model: "Heavy Duty 4423",

        serialNumber:
          `SN-TEST-${randomUUID()}`,
      },
      machineRepository,
    );

    machineId = machine.id;

    // 3. Crear la primera reparación.

    const repair = await registerRepairOrder(
      {
        machineId: machine.id,

        reportedIssue:
          "  La máquina no realiza las puntadas.  ",

        receivedAccessories:
          "  Pedal y cable de alimentación.  ",
      },
      repairRepository,
    );

    // 4. Verificar que la orden existe en PostgreSQL.

    const savedRepair =
      await prisma.repairOrder.findUnique({
        where: {
          id: repair.id,
        },

        include: {
          statusHistory: true,
        },
      });

    assert.ok(savedRepair);

    assert.equal(
      savedRepair.machineId,
      machine.id,
    );

    assert.equal(
      savedRepair.reportedIssue,
      "La máquina no realiza las puntadas.",
    );

    assert.equal(
      savedRepair.receivedAccessories,
      "Pedal y cable de alimentación.",
    );

    assert.equal(
      savedRepair.status,
      "RECEIVED",
    );

    assert.deepEqual(
      savedRepair.receivedAt,
      repair.receivedAt,
    );

    // 5. Verificar que se creó el historial inicial.

    assert.equal(
      savedRepair.statusHistory.length,
      1,
    );

    const initialHistory =
      savedRepair.statusHistory[0];
    assert.equal(initialHistory.changedByUserId, null);

    assert.equal(
      initialHistory.fromStatus,
      null,
    );

    assert.equal(
      initialHistory.toStatus,
      "RECEIVED",
    );

    assert.equal(
      initialHistory.repairOrderId,
      repair.id,
    );

    assert.deepEqual(
      initialHistory.changedAt,
      repair.receivedAt,
    );

    // 6. No permitir una segunda reparación abierta
    // para la misma máquina.

    await assert.rejects(
      registerRepairOrder(
        {
          machineId: machine.id,

          reportedIssue:
            "Intento de registrar otra reparación abierta.",
        },
        repairRepository,
      ),
    );

    // 7. Comprobar que el intento fallido no creó
    // otra orden ni otro registro de historial.

    const savedOrders =
      await prisma.repairOrder.findMany({
        where: {
          machineId: machine.id,
        },

        include: {
          statusHistory: true,
        },
      });

    assert.equal(savedOrders.length, 1);

    assert.equal(
      savedOrders[0].statusHistory.length,
      1,
    );

    // 8. No permitir reparaciones de máquinas inexistentes.

    await assert.rejects(
      registerRepairOrder(
        {
          machineId: randomUUID(),

          reportedIssue:
            "Reparación de una máquina inexistente.",
        },
        repairRepository,
      ),
    );

  } finally {

    // Eliminar únicamente los datos creados
    // por esta prueba.

    // Primero eliminamos el historial,
    // después las reparaciones, la máquina
    // y finalmente el cliente.

    if (machineId) {

      const repairIds =
        await prisma.repairOrder.findMany({
          where: {
            machineId,
          },

          select: {
            id: true,
          },
        });

      await prisma.repairStatusHistory.deleteMany({
        where: {
          repairOrderId: {
            in: repairIds.map((repair) => repair.id),
          },
        },
      });

      await prisma.repairOrder.deleteMany({
        where: {
          machineId,
        },
      });

      await prisma.machine.deleteMany({
        where: {
          id: machineId,
        },
      });
    }

    if (customerId) {

      await prisma.customer.deleteMany({
        where: {
          id: customerId,
        },
      });
    }

    await prisma.$disconnect();
  }
});