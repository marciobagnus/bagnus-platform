
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

import { registerRepairOrder } from "../../src/modules/repairs/application/register-repair-order.ts";

function createFakeRepository() {
  const repairs = [];

  return {
    repairs,

    async add(repairOrder) {
      repairs.push(repairOrder);
    },
  };
}

function validRepairInput() {
  return {
    machineId: randomUUID(),

    reportedIssue:
      "  La máquina no realiza las puntadas correctamente.  ",

    receivedAccessories:
      "  Pedal, cable de alimentación y funda.  ",
  };
}

test("registra una reparación con estado inicial RECEIVED", async () => {
  const repository = createFakeRepository();

  const repair = await registerRepairOrder(
    validRepairInput(),
    repository,
  );

  assert.match(
    repair.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );

  assert.equal(repair.status, "RECEIVED");

  assert.equal(
    repair.reportedIssue,
    "La máquina no realiza las puntadas correctamente.",
  );

  assert.equal(
    repair.receivedAccessories,
    "Pedal, cable de alimentación y funda.",
  );

  assert.ok(repair.receivedAt instanceof Date);

  assert.deepEqual(
    repair.receivedAt,
    repair.createdAt,
  );

  assert.deepEqual(
    repair.createdAt,
    repair.updatedAt,
  );

  assert.equal(repository.repairs.length, 1);

  assert.deepEqual(
    repository.repairs[0],
    repair,
  );
});

test("rechaza una máquina con identificador inválido", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    registerRepairOrder(
      {
        ...validRepairInput(),
        machineId: "12345",
      },
      repository,
    ),
    /identificador de la máquina no es válido/,
  );

  assert.equal(repository.repairs.length, 0);
});

test("rechaza una reparación sin descripción del problema", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    registerRepairOrder(
      {
        ...validRepairInput(),
        reportedIssue: "   ",
      },
      repository,
    ),
    /descripción del problema es obligatoria/,
  );

  assert.equal(repository.repairs.length, 0);
});

test("permite registrar una reparación sin accesorios", async () => {
  const repository = createFakeRepository();

  const repair = await registerRepairOrder(
    {
      machineId: randomUUID(),
      reportedIssue: "Problema con el motor.",
    },
    repository,
  );

  assert.equal(repair.receivedAccessories, null);

  assert.equal(repair.status, "RECEIVED");

  assert.equal(repository.repairs.length, 1);
});

test("propaga los errores del repositorio", async () => {
  const repository = {
    async add() {
      throw new Error("Error de persistencia");
    },
  };

  await assert.rejects(
    registerRepairOrder(
      validRepairInput(),
      repository,
    ),
    /Error de persistencia/,
  );
});