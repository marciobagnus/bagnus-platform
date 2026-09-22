import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  getRepairBalance,
} from "../../src/modules/payments/application/get-repair-balance.ts";

const repairId = randomUUID();

function repository(situation, payments = []) {
  return {
    async findBillingData() {
      return { situation, payments };
    },
  };
}

test("descuenta pagos del presupuesto aprobado", async () => {
  const balance = await getRepairBalance(
    repairId,
    repository(
      {
        kind: "REPAIR_APPROVED",
        approvedQuoteAmount: "50000.00",
      },
      ["5000.00", "12500.00"],
    ),
  );

  assert.equal(balance.status, "DETERMINED");
  assert.equal(balance.paidAmount, "17500.00");
  assert.equal(balance.outstandingAmount, "32500.00");
});

test("calcula la deuda de un diagnóstico cobrado", async () => {
  const balance = await getRepairBalance(
    repairId,
    repository(
      {
        kind: "REPAIR_REJECTED_DIAGNOSIS_CHARGED",
        diagnosisAmount: "5000.00",
      },
      ["2000.00"],
    ),
  );

  assert.equal(balance.outstandingAmount, "3000.00");
});

test("un diagnóstico condonado no genera deuda", async () => {
  const balance = await getRepairBalance(
    repairId,
    repository({
      kind: "REPAIR_REJECTED_DIAGNOSIS_WAIVED",
    }),
  );

  assert.equal(balance.totalAmount, "0.00");
  assert.equal(balance.outstandingAmount, "0.00");
});

test("no inventa un saldo antes de determinar el importe", async () => {
  const balance = await getRepairBalance(
    repairId,
    repository(
      { kind: "PENDING_DECISION" },
      ["5000.00"],
    ),
  );

  assert.equal(balance.status, "PENDING");
  assert.equal(balance.outstandingAmount, null);
});