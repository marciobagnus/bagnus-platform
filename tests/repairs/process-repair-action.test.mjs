import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  processRepairAction,
  RepairActionConflictError,
  RepairActionNotFoundError,
} from "../../src/modules/repairs/application/process-repair-action.ts";

function createFakeRepository(initialStatus) {
  let status = initialStatus;
  const history = [];

  return {
    history,

    async findCurrentStatus() {
      return status;
    },

    async saveStatusChange(
      repairId,
      expectedStatus,
      change,
    ) {
      if (status !== expectedStatus) {
        throw new Error("Conflicto de actualización.");
      }

      history.push({
        repairId,
        ...change,
      });

      status = change.toStatus;
    },

    getStatus() {
      return status;
    },
  };
}

test("finaliza una reparación en curso", async () => {
  const repository = createFakeRepository("IN_REPAIR");

  const result = await processRepairAction(
    {
      repairId: randomUUID(),
      action: "FINISH_REPAIR",
    },
    repository,
  );

  assert.equal(result.previousStatus, "IN_REPAIR");
  assert.equal(result.status, "READY_FOR_PICKUP");

  assert.equal(repository.getStatus(), "READY_FOR_PICKUP");
  assert.equal(repository.history.length, 1);

  assert.equal(
    repository.history[0].fromStatus,
    "IN_REPAIR",
  );

  assert.equal(
    repository.history[0].toStatus,
    "READY_FOR_PICKUP",
  );
});

test("entrega una máquina reparada", async () => {
  const repository =
    createFakeRepository("READY_FOR_PICKUP");

  const result = await processRepairAction(
    {
      repairId: randomUUID(),
      action: "HAND_OVER_MACHINE",
    },
    repository,
  );

  assert.equal(result.status, "DELIVERED");
  assert.equal(repository.getStatus(), "DELIVERED");
  assert.equal(repository.history.length, 1);
});

test("entrega una máquina sin reparar tras el rechazo", async () => {
  const repository =
    createFakeRepository("AWAITING_PICKUP_UNREPAIRED");

  const result = await processRepairAction(
    {
      repairId: randomUUID(),
      action: "HAND_OVER_MACHINE",
    },
    repository,
  );

  assert.equal(
    result.status,
    "CANCELLED",
  );

  assert.equal(
    repository.getStatus(),
    "CANCELLED",
  );

  assert.equal(repository.history.length, 1);
});

test("impide entregar una máquina que todavía está en reparación", async () => {
  const repository = createFakeRepository("IN_REPAIR");

  await assert.rejects(
    processRepairAction(
      {
        repairId: randomUUID(),
        action: "HAND_OVER_MACHINE",
      },
      repository,
    ),
    RepairActionConflictError,
  );

  assert.equal(repository.history.length, 0);
});

test("impide entregar dos veces la misma orden", async () => {
  const repository = createFakeRepository("DELIVERED");

  await assert.rejects(
    processRepairAction(
      {
        repairId: randomUUID(),
        action: "HAND_OVER_MACHINE",
      },
      repository,
    ),
    RepairActionConflictError,
  );

  assert.equal(repository.history.length, 0);
});

test("impide finalizar una reparación que no está en curso", async () => {
  const repository =
    createFakeRepository("WAITING_APPROVAL");

  await assert.rejects(
    processRepairAction(
      {
        repairId: randomUUID(),
        action: "FINISH_REPAIR",
      },
      repository,
    ),
    RepairActionConflictError,
  );

  assert.equal(repository.history.length, 0);
});

test("rechaza una reparación inexistente", async () => {
  const repository = createFakeRepository(null);

  await assert.rejects(
    processRepairAction(
      {
        repairId: randomUUID(),
        action: "FINISH_REPAIR",
      },
      repository,
    ),
    RepairActionNotFoundError,
  );
});

test("rechaza un identificador inválido", async () => {
  const repository = createFakeRepository("IN_REPAIR");

  await assert.rejects(
    processRepairAction(
      {
        repairId: "123",
        action: "FINISH_REPAIR",
      },
      repository,
    ),
    /identificador de la reparación no es válido/,
  );

  assert.equal(repository.history.length, 0);
});