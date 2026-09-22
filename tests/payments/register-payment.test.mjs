import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  registerPayment,
} from "../../src/modules/payments/application/register-payment.ts";

function createFakeRepository() {
  const payments = [];

  return {
    payments,

    async add(payment) {
      payments.push(payment);
    },
  };
}

function validInput() {
  return {
    repairOrderId: randomUUID(),
    amount: "5000.00",
    method: "TRANSFER",
    reference: " OP-12345 ",
    note: " Seña de reparación ",
  };
}

test("registra un pago y normaliza sus datos", async () => {
  const repository = createFakeRepository();
  const input = validInput();

  const payment = await registerPayment(
    input,
    repository,
  );

  assert.match(payment.id, /^[0-9a-f-]{36}$/);
  assert.equal(payment.repairOrderId, input.repairOrderId);
  assert.equal(payment.amount, "5000.00");
  assert.equal(payment.currency, "ARS");
  assert.equal(payment.method, "TRANSFER");
  assert.equal(payment.reference, "OP-12345");
  assert.equal(payment.note, "Seña de reparación");

  assert.ok(payment.receivedAt instanceof Date);
  assert.ok(payment.createdAt instanceof Date);

  assert.equal(repository.payments.length, 1);
  assert.deepEqual(repository.payments[0], payment);
});

test("permite registrar un pago sin referencia ni nota", async () => {
  const repository = createFakeRepository();

  const payment = await registerPayment(
    {
      repairOrderId: randomUUID(),
      amount: "1500",
      method: "CASH",
    },
    repository,
  );

  assert.equal(payment.reference, null);
  assert.equal(payment.note, null);
  assert.equal(repository.payments.length, 1);
});

test("rechaza importes inválidos sin guardar el pago", async () => {
  const invalidAmounts = [
    "0",
    "0.00",
    "-100",
    "12.345",
    "abc",
    "",
    "10000000000",
  ];

  for (const amount of invalidAmounts) {
    const repository = createFakeRepository();

    await assert.rejects(
      registerPayment(
        { ...validInput(), amount },
        repository,
      ),
      /importe del pago debe ser positivo/,
    );

    assert.equal(repository.payments.length, 0);
  }
});

test("rechaza una reparación con identificador inválido", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    registerPayment(
      {
        ...validInput(),
        repairOrderId: "12345",
      },
      repository,
    ),
    /identificador de la reparación no es válido/,
  );

  assert.equal(repository.payments.length, 0);
});

test("rechaza un medio de pago desconocido", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    registerPayment(
      {
        ...validInput(),
        method: "UNKNOWN",
      },
      repository,
    ),
    /medio de pago no es válido/,
  );

  assert.equal(repository.payments.length, 0);
});