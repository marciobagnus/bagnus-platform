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
    // 1. Crear los datos exclusivos del test.
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
        status: "IN_REPAIR",
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
        description: "Reparación de prueba",
        totalAmount: "10000.00",
        status: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
    });

    // 2. Registrar dos pagos parciales.
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

    const secondPayment = await registerPayment(
      {
        repairOrderId,
        amount: "2500.50",
        method: "CASH",
      },
      repository,
    );

    // 3. Verificar los dos pagos iniciales.
    const savedPayments = await prisma.payment.findMany({
      where: { repairOrderId },
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

    assert.equal(savedSecond.repairOrderId, repairOrderId);
    assert.equal(savedSecond.amount.toFixed(2), "2500.50");
    assert.equal(savedSecond.method, "CASH");
    assert.equal(savedSecond.reference, null);
    assert.equal(savedSecond.note, null);

    // Saldo: 10000.00 - 5000.00 - 2500.50 = 2499.50.

    // 4. Rechazar un pago superior al saldo.
    await assert.rejects(
      registerPayment(
        {
          repairOrderId,
          amount: "3000.00",
          method: "CASH",
        },
        repository,
      ),
      /supera el saldo pendiente/,
    );

    assert.equal(
      await prisma.payment.count({
        where: { repairOrderId },
      }),
      2,
    );

    // 5. Dos cobros simultáneos de 2000.00
    // no pueden registrarse ambos.
    const concurrentResults = await Promise.allSettled([
      registerPayment(
        {
          repairOrderId,
          amount: "2000.00",
          method: "CASH",
        },
        repository,
      ),
      registerPayment(
        {
          repairOrderId,
          amount: "2000.00",
          method: "TRANSFER",
        },
        repository,
      ),
    ]);

    const successful = concurrentResults.filter(
      (result) => result.status === "fulfilled",
    );

    const rejected = concurrentResults.filter(
      (result) => result.status === "rejected",
    );

    assert.equal(
      successful.length,
      1,
      "Exactamente uno de los cobros simultáneos debe registrarse.",
    );

    assert.equal(
      rejected.length,
      1,
      "Exactamente uno de los cobros simultáneos debe rechazarse.",
    );

    // Es fundamental comprobar el MOTIVO del rechazo:
    // no alcanza con que falle por un problema de conexión.
    const rejectedResult = rejected[0];

    assert.equal(rejectedResult.status, "rejected");

    assert.match(
      String(rejectedResult.reason),
      /supera el saldo pendiente/,
      "El cobro debe rechazarse por saldo insuficiente.",
    );

    // 6. Verificar el total final en PostgreSQL.
    const finalPayments = await prisma.payment.findMany({
      where: { repairOrderId },
    });

    assert.equal(finalPayments.length, 3);

    const totalPaid = finalPayments.reduce(
      (sum, payment) =>
        sum + BigInt(payment.amount.mul(100).toFixed(0)),
      0n,
    );

    assert.equal(totalPaid, 950050n);

    // 7. Rechazar pagos de reparaciones inexistentes.
    await assert.rejects(
      registerPayment(
        {
          repairOrderId: randomUUID(),
          amount: "1000.00",
          method: "CASH",
        },
        repository,
      ),
      /reparación indicada no existe/,
    );
  } finally {
    // Eliminar los datos del test respetando las relaciones.
    await prisma.payment.deleteMany({
      where: { repairOrderId },
    });

    await prisma.repairQuote.deleteMany({
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