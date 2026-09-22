import assert from "node:assert/strict";
import { test } from "node:test";

import {
  determineRepairAmountDue,
} from "../../src/modules/payments/domain/repair-amount-due.ts";

test("mantiene pendiente el importe antes de la decisión", () => {
  const result = determineRepairAmountDue({
    kind: "PENDING_DECISION",
  });

  assert.deepEqual(result, {
    status: "PENDING",
    totalAmount: null,
  });
});

test("utiliza el presupuesto aprobado como importe a cobrar", () => {
  const result = determineRepairAmountDue({
    kind: "REPAIR_APPROVED",
    approvedQuoteAmount: "50000",
  });

  assert.deepEqual(result, {
    status: "DETERMINED",
    totalAmount: "50000.00",
  });
});

test("utiliza el cargo de diagnóstico si se rechaza la reparación", () => {
  const result = determineRepairAmountDue({
    kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
    diagnosisAmount: "5000",
  });

  assert.deepEqual(result, {
    status: "DETERMINED",
    totalAmount: "5000.00",
  });
});

test("permite no cobrar el diagnóstico", () => {
  const result = determineRepairAmountDue({
    kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED",
  });

  assert.deepEqual(result, {
    status: "DETERMINED",
    totalAmount: "0.00",
  });
});

test("rechaza importes de cobro inválidos", () => {
  for (const amount of ["0", "-100", "12.345", "abc", ""]) {
    assert.throws(
      () =>
        determineRepairAmountDue({
          kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
          diagnosisAmount: amount,
        }),
      /importe a cobrar debe ser positivo/,
    );
  }
});