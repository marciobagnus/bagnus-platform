import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  createDiagnosisCharge,
} from "../../src/modules/payments/domain/diagnosis-charge.ts";

function validInput() {
  return {
    id: randomUUID(),
    repairOrderId: randomUUID(),
    now: new Date(),
  };
}

test("registra la decisión de cobrar un diagnóstico", () => {
  const charge = createDiagnosisCharge({
    ...validInput(),
    decision: "CHARGED",
    amount: "5000",
    note: "  Cliente rechazó el presupuesto  ",
  });

  assert.equal(charge.decision, "CHARGED");
  assert.equal(charge.amount, "5000.00");
  assert.equal(charge.currency, "ARS");
  assert.equal(
    charge.note,
    "Cliente rechazó el presupuesto",
  );
});

test("permite condonar el diagnóstico", () => {
  const charge = createDiagnosisCharge({
    ...validInput(),
    decision: "WAIVED",
  });

  assert.equal(charge.decision, "WAIVED");
  assert.equal(charge.amount, "0.00");
  assert.equal(charge.note, null);
});

test("rechaza importes inválidos al cobrar diagnóstico", () => {
  for (const amount of ["0", "-100", "12.345", "abc", ""]) {
    assert.throws(
      () =>
        createDiagnosisCharge({
          ...validInput(),
          decision: "CHARGED",
          amount,
        }),
      /diagnóstico cobrado debe tener un importe positivo/,
    );
  }
});

test("impide asignar un importe al diagnóstico condonado", () => {
  assert.throws(
    () =>
      createDiagnosisCharge({
        ...validInput(),
        decision: "WAIVED",
        amount: "5000",
      }),
    /diagnóstico condonado no debe tener un importe/,
  );
});

test("rechaza identificadores de reparación inválidos", () => {
  assert.throws(
    () =>
      createDiagnosisCharge({
        ...validInput(),
        repairOrderId: "12345",
        decision: "WAIVED",
      }),
    /identificador de la reparación no es válido/,
  );
});