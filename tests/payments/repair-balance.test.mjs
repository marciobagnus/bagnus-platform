import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateRepairBalance,
  assertPaymentWithinBalance,
} from "../../src/modules/payments/domain/repair-balance.ts";

test("calcula el saldo sin pagos previos", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: [],
  });

  assert.deepEqual(balance, {
    totalAmount: "50000.00",
    paidAmount: "0.00",
    outstandingAmount: "50000.00",
    creditAmount: "0.00",
  });
});

test("descuenta varios pagos parciales del presupuesto", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["5000.00", "12500.50"],
  });

  assert.equal(balance.paidAmount, "17500.50");
  assert.equal(balance.outstandingAmount, "32499.50");
  assert.equal(balance.creditAmount, "0.00");
});

test("considera un diagnóstico ya pagado como pago a cuenta", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["5000.00"],
  });

  assert.equal(balance.outstandingAmount, "45000.00");
});

test("permite saldar exactamente la deuda", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["5000.00"],
  });

  assert.doesNotThrow(() => {
    assertPaymentWithinBalance(balance, "45000.00");
  });
});

test("rechaza un nuevo pago que supera el saldo", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["5000.00"],
  });

  assert.throws(
    () => assertPaymentWithinBalance(balance, "45000.01"),
    /supera el saldo pendiente/,
  );
});

test("rechaza nuevos pagos cuando la deuda está saldada", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["50000.00"],
  });

  assert.equal(balance.outstandingAmount, "0.00");

  assert.throws(
    () => assertPaymentWithinBalance(balance, "1000.00"),
    /supera el saldo pendiente/,
  );
});

test("informa un excedente sin ocultarlo", () => {
  const balance = calculateRepairBalance({
    totalAmount: "50000.00",
    payments: ["51000.00"],
  });

  assert.equal(balance.outstandingAmount, "0.00");
  assert.equal(balance.creditAmount, "1000.00");
});

test("rechaza importes inválidos", () => {
  for (const amount of ["-1", "12.345", "abc", ""]) {
    assert.throws(
      () =>
        calculateRepairBalance({
          totalAmount: amount,
          payments: [],
        }),
      /importe debe ser un valor no negativo/,
    );
  }
});

test("rechaza pagos registrados con importe cero", () => {
  assert.throws(
    () =>
      calculateRepairBalance({
        totalAmount: "50000.00",
        payments: ["0.00"],
      }),
    /pagos registrados deben tener un importe positivo/,
  );
});