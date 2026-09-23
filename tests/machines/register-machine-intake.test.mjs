import assert from "node:assert/strict";
import { test } from "node:test";

import { registerMachineIntake } from "../../src/modules/machines/application/register-machine-intake.ts";

test("crea una máquina y su reparación inicial con IDs relacionados", async () => {
  const saved = [];
  const result = await registerMachineIntake(
    {
      customerId: "550e8400-e29b-41d4-a716-446655440000",
      brand: "Singer",
      type: "Recta",
      model: "4423",
      reportedIssue: "No arrastra la tela.",
    },
    {
      async add(machine, repair) {
        saved.push({ machine, repair });
      },
    },
  );

  assert.equal(result.repair.machineId, result.machine.id);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].repair.reportedIssue, "No arrastra la tela.");
});

test("rechaza el ingreso sin problema informado", async () => {
  await assert.rejects(
    registerMachineIntake(
      {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        brand: "Singer",
        type: "Recta",
        reportedIssue: "  ",
      },
      { async add() {} },
    ),
    /descripción del problema es obligatoria/,
  );
});