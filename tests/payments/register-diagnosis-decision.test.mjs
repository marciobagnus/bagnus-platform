import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  registerDiagnosisDecision,
} from "../../src/modules/payments/application/register-diagnosis-decision.ts";

function createFakeRepository() {
  const decisions = [];

  return {
    decisions,

    async saveDecision(charge) {
      decisions.push(charge);
    },
  };
}

test("registra una decisión de cobrar diagnóstico", async () => {
  const repository = createFakeRepository();
  const repairOrderId = randomUUID();

  const charge = await registerDiagnosisDecision(
    {
      repairOrderId,
      decision: "CHARGED",
      amount: "5000",
      note: " Cliente rechazó el presupuesto ",
    },
    repository,
  );

  assert.equal(charge.repairOrderId, repairOrderId);
  assert.equal(charge.decision, "CHARGED");
  assert.equal(charge.amount, "5000.00");
  assert.equal(
    charge.note,
    "Cliente rechazó el presupuesto",
  );
  assert.equal(repository.decisions.length, 1);
  assert.deepEqual(repository.decisions[0], charge);
});

test("permite condonar el diagnóstico", async () => {
  const repository = createFakeRepository();

  const charge = await registerDiagnosisDecision(
    {
      repairOrderId: randomUUID(),
      decision: "WAIVED",
    },
    repository,
  );

  assert.equal(charge.amount, "0.00");
  assert.equal(repository.decisions.length, 1);
});

test("no guarda una decisión con un importe inválido", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    registerDiagnosisDecision(
      {
        repairOrderId: randomUUID(),
        decision: "CHARGED",
        amount: "0",
      },
      repository,
    ),
    /diagnóstico cobrado debe tener un importe positivo/,
  );

  assert.equal(repository.decisions.length, 0);
});

test("propaga los errores del repositorio", async () => {
  const repository = {
    async saveDecision() {
      throw new Error("Error de persistencia");
    },
  };

  await assert.rejects(
    registerDiagnosisDecision(
      {
        repairOrderId: randomUUID(),
        decision: "WAIVED",
      },
      repository,
    ),
    /Error de persistencia/,
  );
});