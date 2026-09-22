import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import { registerDiagnosisDecision } from "../../src/modules/payments/application/register-diagnosis-decision.ts";

import {
  PrismaDiagnosisChargeRepository,
} from "../../src/modules/payments/infrastructure/prisma-diagnosis-charge-repository.ts";

const repository = new PrismaDiagnosisChargeRepository();

type FixtureOptions = {
  status?: "AWAITING_PICKUP_UNREPAIRED" | "RECEIVED";
  rejectedQuote?: boolean;
};

async function withRepairFixture(
  options: FixtureOptions,
  run: (repairOrderId: string) => Promise<void>,
): Promise<void> {
  const customerId = randomUUID();
  const machineId = randomUUID();
  const repairOrderId = randomUUID();
  const quoteId = randomUUID();
  const now = new Date();

  try {
    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Cliente",
        lastName: "Prueba diagnóstico",
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
        reportedIssue: "Reparación de prueba para diagnóstico.",
        status: options.status ?? "AWAITING_PICKUP_UNREPAIRED",
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (options.rejectedQuote ?? true) {
      await prisma.repairQuote.create({
        data: {
          id: quoteId,
          repairOrderId,
          version: 1,
          description: "Presupuesto de prueba rechazado.",
          totalAmount: "50000.00",
          currency: "ARS",
          status: "REJECTED",
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.quoteDecision.create({
        data: {
          id: randomUUID(),
          quoteId,
          approved: false,
          channel: "IN_PERSON",
          note: "Rechazo registrado para la prueba.",
          decidedAt: now,
        },
      });
    }

    await run(repairOrderId);
  } finally {
    // Eliminamos únicamente los datos creados por esta prueba.
    await prisma.diagnosisCharge.deleteMany({
      where: { repairOrderId },
    });

    await prisma.payment.deleteMany({
      where: { repairOrderId },
    });

    await prisma.quoteDecision.deleteMany({
      where: { quoteId },
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
}

test("guarda un diagnóstico cobrado sin crear un pago", async () => {
  await withRepairFixture({}, async (repairOrderId) => {
    const charge = await registerDiagnosisDecision(
      {
        repairOrderId,
        decision: "CHARGED",
        amount: "5000",
        note: "Cliente rechazó la reparación.",
      },
      repository,
    );

    const saved = await prisma.diagnosisCharge.findUnique({
      where: { repairOrderId },
    });

    assert.ok(saved);
    assert.equal(saved.id, charge.id);
    assert.equal(saved.decision, "CHARGED");
    assert.equal(saved.amount.toFixed(2), "5000.00");
    assert.equal(saved.currency, "ARS");
    assert.equal(
      saved.note,
      "Cliente rechazó la reparación.",
    );

    const paymentCount = await prisma.payment.count({
      where: { repairOrderId },
    });

    assert.equal(paymentCount, 0);
  });
});

test("guarda un diagnóstico condonado con importe cero", async () => {
  await withRepairFixture({}, async (repairOrderId) => {
    await registerDiagnosisDecision(
      {
        repairOrderId,
        decision: "WAIVED",
        note: "El taller decidió no cobrar el diagnóstico.",
      },
      repository,
    );

    const saved = await prisma.diagnosisCharge.findUnique({
      where: { repairOrderId },
    });

    assert.ok(saved);
    assert.equal(saved.decision, "WAIVED");
    assert.equal(saved.amount.toFixed(2), "0.00");
  });
});

test("impide registrar dos decisiones para la misma reparación", async () => {
  await withRepairFixture({}, async (repairOrderId) => {
    await registerDiagnosisDecision(
      {
        repairOrderId,
        decision: "CHARGED",
        amount: "5000",
      },
      repository,
    );

    await assert.rejects(
      registerDiagnosisDecision(
        {
          repairOrderId,
          decision: "WAIVED",
        },
        repository,
      ),
      /ya tiene una decisión de diagnóstico registrada/,
    );

    const count = await prisma.diagnosisCharge.count({
      where: { repairOrderId },
    });

    assert.equal(count, 1);
  });
});

test("impide decidir un diagnóstico si la reparación no fue rechazada", async () => {
  await withRepairFixture(
    {
      status: "RECEIVED",
      rejectedQuote: false,
    },
    async (repairOrderId) => {
      await assert.rejects(
        registerDiagnosisDecision(
          {
            repairOrderId,
            decision: "CHARGED",
            amount: "5000",
          },
          repository,
        ),
        /Solo se puede decidir el cargo de diagnóstico/,
      );

      const count = await prisma.diagnosisCharge.count({
        where: { repairOrderId },
      });

      assert.equal(count, 0);
    },
  );
});

test("solo registra una decisión ante dos solicitudes simultáneas", async () => {
  await withRepairFixture({}, async (repairOrderId) => {
    const results = await Promise.allSettled([
      registerDiagnosisDecision(
        {
          repairOrderId,
          decision: "CHARGED",
          amount: "5000",
        },
        repository,
      ),
      registerDiagnosisDecision(
        {
          repairOrderId,
          decision: "WAIVED",
        },
        repository,
      ),
    ]);

    const successful = results.filter(
      (result) => result.status === "fulfilled",
    );

    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    assert.equal(successful.length, 1);
    assert.equal(rejected.length, 1);

    const saved = await prisma.diagnosisCharge.findMany({
      where: { repairOrderId },
    });

    assert.equal(saved.length, 1);

    assert.ok(
      saved[0].decision === "CHARGED" ||
      saved[0].decision === "WAIVED",
    );
  });
});

after(async () => {
  await prisma.$disconnect();
});