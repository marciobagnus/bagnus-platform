
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  createInitialRepairQuote,
} from "../../src/modules/quotes/application/create-initial-repair-quote.ts";

import {
  PrismaRepairQuoteRepository,
  RepairQuoteConflictError,
} from "../../src/modules/quotes/infrastructure/prisma-repair-quote-repository.ts";

test("crea un presupuesto inicial en PostgreSQL y evita duplicados", async () => {
  const customerId = randomUUID();
  const machineId = randomUUID();
  const repairId = randomUUID();

  const now = new Date();

  const repository = new PrismaRepairQuoteRepository();

  try {
    // 1. Crear datos exclusivos para esta prueba.

    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Cliente",
        lastName: "Prueba Presupuesto",
        dni: null,
        phone: `351${randomInt(10000000, 100000000)}`,
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
        reportedIssue: "Problema de arrastre.",
        receivedAccessories: null,
        status: "RECEIVED",
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 2. Crear el presupuesto inicial.

    const quote = await createInitialRepairQuote(
      {
        repairOrderId: repairId,
        description: "  Reparación y puesta a punto.  ",
        totalAmount: "45000.50",
      },
      repository,
    );

    assert.equal(quote.version, 1);
    assert.equal(quote.status, "WAITING_APPROVAL");

    // 3. Consultar lo que realmente quedó guardado.

    const savedQuote = await prisma.repairQuote.findUnique({
      where: {
        id: quote.id,
      },
    });

    assert.ok(savedQuote);

    assert.equal(savedQuote.repairOrderId, repairId);
    assert.equal(savedQuote.version, 1);
    assert.equal(savedQuote.status, "WAITING_APPROVAL");
    assert.equal(
      savedQuote.description,
      "Reparación y puesta a punto.",
    );

    // Decimal de Prisma: convertir a string
    // para comprobar el importe exacto.

    assert.equal(
      savedQuote.totalAmount.toFixed(2),
      "45000.50",
    );

    // 4. Intentar crear otro presupuesto inicial.

    await assert.rejects(
      createInitialRepairQuote(
        {
          repairOrderId: repairId,
          description: "Segundo presupuesto inicial",
          totalAmount: "50000.00",
        },
        repository,
      ),
      RepairQuoteConflictError,
    );

    // 5. Comprobar que solamente existe uno.

    const quotes = await prisma.repairQuote.findMany({
      where: {
        repairOrderId: repairId,
      },
    });

    assert.equal(quotes.length, 1);

    // 6. Crear y enviar cambia la reparación y registra una transición.

    const repair = await prisma.repairOrder.findUnique({
      where: {
        id: repairId,
      },
    });

    assert.equal(repair?.status, "WAITING_APPROVAL");
    assert.equal(await prisma.repairStatusHistory.count({where:{repairOrderId:repairId}}), 1);

  } finally {
    // Borrar solamente los registros de esta prueba.
    // Primero los presupuestos y después sus padres.

    await prisma.repairQuote.deleteMany({
      where: {
        repairOrderId: repairId,
      },
    });

    await prisma.repairStatusHistory.deleteMany({
      where: {
        repairOrderId: repairId,
      },
    });

    await prisma.repairOrder.deleteMany({
      where: {
        id: repairId,
      },
    });

    await prisma.machine.deleteMany({
      where: {
        id: machineId,
      },
    });

    await prisma.customer.deleteMany({
      where: {
        id: customerId,
      },
    });

    await prisma.$disconnect();
  }
});