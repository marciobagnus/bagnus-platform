import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import { PrismaRepairOrderQueryRepository } from "../../src/modules/repairs/infrastructure/prisma-repair-order-query-repository.ts";

const repository = new PrismaRepairOrderQueryRepository();

test("incluye resumen financiero, pagos y diagnóstico en el detalle de reparación", async () => {
  const customerId = randomUUID();
  const machineId = randomUUID();
  const repairOrderId = randomUUID();
  const now = new Date();

  try {
    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Ana",
        lastName: "Pérez",
        phone: `test-${customerId}`,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.machine.create({
      data: {
        id: machineId,
        customerId,
        brand: "Samsung",
        type: "Lavadora",
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.repairOrder.create({
      data: {
        id: repairOrderId,
        machineId,
        reportedIssue: "No centrifuga",
        status: "READY_FOR_PICKUP",
        resolution: "REPAIRED",
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
        description: "Revisión principal",
        totalAmount: "100.00",
        currency: "ARS",
        status: "APPROVED",
        createdAt: now,
        updatedAt: now,
      },
    });

    const firstPaymentId = randomUUID();
    const secondPaymentId = randomUUID();

    await prisma.payment.createMany({
      data: [
        {
          id: firstPaymentId,
          repairOrderId,
          amount: "30.00",
          currency: "ARS",
          method: "CASH",
          reference: null,
          note: "Pago inicial",
          receivedAt: new Date(now.getTime() + 5_000),
          createdAt: now,
        },
        {
          id: secondPaymentId,
          repairOrderId,
          amount: "20.00",
          currency: "ARS",
          method: "TRANSFER",
          reference: "ABC-123",
          note: null,
          receivedAt: new Date(now.getTime() + 10_000),
          createdAt: now,
        },
      ],
    });

    await prisma.diagnosisCharge.create({
      data: {
        id: randomUUID(),
        repairOrderId,
        decision: "WAIVED",
        amount: "0.00",
        currency: "ARS",
        note: "Sin cargo",
        decidedAt: new Date(now.getTime() + 15_000),
      },
    });

    const repair = await repository.findById(repairOrderId);

    assert.ok(repair);
    assert.equal(repair.billing.billingResolved, true);
    assert.equal(repair.billing.amountDue, "100.00");
    assert.equal(repair.billing.totalPaid, "50.00");
    assert.equal(repair.billing.outstandingBalance, "50.00");
    assert.equal(repair.billing.currency, "ARS");
    assert.equal(repair.billing.hasOutstandingBalance, true);
    assert.equal(repair.payments.length, 2);
    assert.deepEqual(
      repair.payments.map((payment) => payment.id),
      [firstPaymentId, secondPaymentId],
    );
    assert.equal(repair.diagnosisCharge?.decision, "WAIVED");
  } finally {
    await prisma.payment.deleteMany({ where: { repairOrderId } });
    await prisma.diagnosisCharge.deleteMany({ where: { repairOrderId } });
    await prisma.repairQuote.deleteMany({ where: { repairOrderId } });
    await prisma.repairStatusHistory.deleteMany({ where: { repairOrderId } });
    await prisma.repairOrder.deleteMany({ where: { id: repairOrderId } });
    await prisma.machine.deleteMany({ where: { id: machineId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
  }
});

after(async () => {
  await prisma.$disconnect();
});
