
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomInt } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { registerMachine } from "../../src/modules/machines/application/register-machine.ts";

import { registerRepairOrder } from "../../src/modules/repairs/application/register-repair-order.ts";

import {
  updateRepairStatus,
  RepairStatusConflictError,
} from "../../src/modules/repairs/application/update-repair-status.ts";

import { changeRepairStatus } from "../../src/modules/repairs/domain/change-repair-status.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { PrismaMachineRepository } from "../../src/modules/machines/infrastructure/prisma-machine-repository.ts";

import { PrismaRepairOrderRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-order-repository.ts";

import { PrismaRepairStatusRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-status-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("actualiza el estado y registra su historial en PostgreSQL", async () => {
  const customerRepository = new PrismaCustomerRepository();
  const machineRepository = new PrismaMachineRepository();
  const repairRepository = new PrismaRepairOrderRepository();
  const statusRepository = new PrismaRepairStatusRepository();

  let customerId: string | undefined;
  let machineId: string | undefined;

  try {
    // 1. Crear un cliente de prueba.

    const customer = await registerCustomer(
      {
        name: "Cliente",
        lastName: "Prueba Estados",
        dni: randomInt(10000000, 100000000).toString(),
        phone: `351${Date.now()}${randomInt(100000, 999999)}`,
      },
      customerRepository,
    );

    customerId = customer.id;

    // 2. Registrar una máquina para ese cliente.

    const machine = await registerMachine(
      {
        customerId: customer.id,
        brand: "Singer",
        type: "Recta",
        model: "Heavy Duty 4423",
      },
      machineRepository,
    );

    machineId = machine.id;

    // 3. Registrar una reparación.

    const repair = await registerRepairOrder(
      {
        machineId: machine.id,
        reportedIssue: "La máquina no realiza las puntadas.",
      },
      repairRepository,
    );

    assert.equal(repair.status, "RECEIVED");

    // 4. Rechazar una transición no permitida.

    await assert.rejects(
      updateRepairStatus(
        {
          repairId: repair.id,
          newStatus: "DELIVERED",
        },
        statusRepository,
      ),
      /No se permite cambiar/,
    );

    // 5. Realizar la transición válida.

    await updateRepairStatus(
      {
        repairId: repair.id,
        newStatus: "DIAGNOSING",
        note: "  El técnico comenzó el diagnóstico.  ",
      },
      statusRepository,
    );

    // 6. Consultar la reparación actualizada.

    const savedRepair = await prisma.repairOrder.findUnique({
      where: {
        id: repair.id,
      },
      include: {
        statusHistory: {
          orderBy: {
            changedAt: "asc",
          },
        },
      },
    });

    assert.ok(savedRepair);

    assert.equal(savedRepair.status, "DIAGNOSING");

    assert.ok(
      savedRepair.updatedAt.getTime() >=
        savedRepair.createdAt.getTime(),
    );

    // 7. Verificar el historial completo.

    assert.equal(savedRepair.statusHistory.length, 2);

    const initialHistory = savedRepair.statusHistory[0];
    const newHistory = savedRepair.statusHistory[1];

    assert.equal(initialHistory.fromStatus, null);
    assert.equal(initialHistory.toStatus, "RECEIVED");

    assert.equal(newHistory.fromStatus, "RECEIVED");
    assert.equal(newHistory.toStatus, "DIAGNOSING");

    assert.equal(
      newHistory.note,
      "El técnico comenzó el diagnóstico.",
    );

    assert.deepEqual(
      newHistory.changedAt,
      savedRepair.updatedAt,
    );

    // 8. Intentar repetir el mismo cambio.
    // No debe generarse otro movimiento.

    await assert.rejects(
      updateRepairStatus(
        {
          repairId: repair.id,
          newStatus: "DIAGNOSING",
        },
        statusRepository,
      ),
      /No se permite cambiar/,
    );

    // 9. Simular una actualización basada en un
    // estado anterior al que existe actualmente.

    const staleChange = changeRepairStatus({
      currentStatus: "RECEIVED",
      newStatus: "DIAGNOSING",
      now: new Date(),
    });

    await assert.rejects(
      statusRepository.saveStatusChange(
        repair.id,
        "RECEIVED",
        staleChange,
      ),
      RepairStatusConflictError,
    );

    // 10. Comprobar que los intentos rechazados
    // no modificaron la reparación ni el historial.

    const finalRepair = await prisma.repairOrder.findUnique({
      where: {
        id: repair.id,
      },
      include: {
        statusHistory: true,
      },
    });

    assert.ok(finalRepair);

    assert.equal(finalRepair.status, "DIAGNOSING");
    assert.equal(finalRepair.statusHistory.length, 2);

    assert.deepEqual(
      finalRepair.updatedAt,
      savedRepair.updatedAt,
    );

  } finally {
    // Eliminar exclusivamente los registros
    // creados por esta prueba.

    if (machineId) {
      const repairIds = await prisma.repairOrder.findMany({
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