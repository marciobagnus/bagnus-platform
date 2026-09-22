import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import { registerPayment } from "../../src/modules/payments/application/register-payment.ts";

import { PrismaPaymentRepository } from "../../src/modules/payments/infrastructure/prisma-payment-repository.ts";

test("registra pagos asociados a una reparación en PostgreSQL", async () => {
  const customerId = randomUUID();
  const machineId = randomUUID();
  const repairOrderId = randomUUID();

  const repository = new PrismaPaymentRepository();
  const now = new Date();

  try {
    // Preparar datos exclusivos de este test.
    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Cliente",
        lastName: "Prueba de pagos",
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
        reportedIssue: "Reparación utilizada para probar pagos.",
        status: "RECEIVED",
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Registrar un pago con referencia.
    const firstPayment = await registerPayment(
      {
        repairOrderId,
        amount: "5000.00",
        method: "TRANSFER",
        reference: "OP-12345",
        note: "Seña de reparación",
      },
      repository,
    );

    // Registrar un segundo pago sin referencia.
    const secondPayment = await registerPayment(
      {
        repairOrderId,
        amount: "2500.50",
        method: "CASH",
      },
      repository,
    );

    // Leer lo que efectivamente quedó guardado.
    const savedPayments = await prisma.payment.findMany({
      where: { repairOrderId },
      orderBy: { receivedAt: "asc" },
    });

    assert.equal(savedPayments.length, 2);

    const savedFirst = savedPayments.find(
      (payment) => payment.id === firstPayment.id,
    );

    const savedSecond = savedPayments.find(
      (payment) => payment.id === secondPayment.id,
    );

    assert.ok(savedFirst);
    assert.ok(savedSecond);

    assert.equal(savedFirst.repairOrderId, repairOrderId);
    assert.equal(savedFirst.amount.toFixed(2), "5000.00");
    assert.equal(savedFirst.currency, "ARS");
    assert.equal(savedFirst.method, "TRANSFER");
    assert.equal(savedFirst.reference, "OP-12345");
    assert.equal(savedFirst.note, "Seña de reparación");

    assert.equal(savedSecond.amount.toFixed(2), "2500.50");
    assert.equal(savedSecond.method, "CASH");
    assert.equal(savedSecond.reference, null);
    assert.equal(savedSecond.note, null);

    // La base debe rechazar pagos vinculados a reparaciones inexistentes.
    await assert.rejects(
      registerPayment(
        {
          repairOrderId: randomUUID(),
          amount: "1000.00",
          method: "CASH",
        },
        repository,
      ),
    );
  } finally {
    // Eliminar únicamente los registros creados por este test.
    await prisma.payment.deleteMany({
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

    await prisma.$disconnect();
  }
});