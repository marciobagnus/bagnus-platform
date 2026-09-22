import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import { getRepairBalance } from "../../src/modules/payments/application/get-repair-balance.ts";
import { PrismaRepairBalanceRepository } from "../../src/modules/payments/infrastructure/prisma-repair-balance-repository.ts";

const repository = new PrismaRepairBalanceRepository();

test("calcula el saldo real de una reparación en PostgreSQL", async () => {
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
        reportedIssue: "Prueba de saldo",
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
        totalAmount: "50000.00",
        status: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.payment.createMany({
      data: [
        {
          id: randomUUID(),
          repairOrderId,
          amount: "5000.00",
          method: "TRANSFER",
          receivedAt: now,
          createdAt: now,
        },
        {
          id: randomUUID(),
          repairOrderId,
          amount: "12500.50",
          method: "CASH",
          receivedAt: now,
          createdAt: now,
        },
      ],
    });

    const balance = await getRepairBalance(
      repairOrderId,
      repository,
    );

    assert.equal(balance.status, "DETERMINED");
    assert.equal(balance.totalAmount, "50000.00");
    assert.equal(balance.paidAmount, "17500.50");
    assert.equal(balance.outstandingAmount, "32499.50");
    assert.equal(balance.creditAmount, "0.00");
  } finally {
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