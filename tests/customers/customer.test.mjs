import test from "node:test";
import assert from "node:assert/strict";
import { createCustomer } from "../../src/modules/customers/domain/customer.ts";

const validInput = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Ana",
  lastName: "Pérez",
  dni: "30123456",
  phone: "+54 351 0123456",
  now: new Date("2026-09-21T12:00:00.000Z"),
};

test("crea un cliente con sus datos y fechas iniciales", () => {
  const customer = createCustomer(validInput);

assert.deepEqual(customer, {
  id: validInput.id,
  name: validInput.name,
  lastName: validInput.lastName,
  dni: validInput.dni,
  phone: validInput.phone,
  email: null,
  address: null,
  createdAt: validInput.now,
  updatedAt: validInput.now,
});
});

test("elimina espacios en los extremos del nombre y teléfono", () => {
  const customer = createCustomer({
    ...validInput,
    name: "  Ana Pérez  ",
    phone: "  +54 351 0123456  ",
  });

  assert.equal(customer.name, "Ana Pérez");
  assert.equal(customer.phone, "+54 351 0123456");
});

test("rechaza nombres vacíos o compuestos solo por espacios", () => {
  for (const name of ["", "   "]) {
    assert.throws(
      () => createCustomer({ ...validInput, name }),
      { message: "El nombre del cliente es obligatorio." },
    );
  }
});

test("rechaza teléfonos vacíos o compuestos solo por espacios", () => {
  for (const phone of ["", "   "]) {
    assert.throws(
      () => createCustomer({ ...validInput, phone }),
      { message: "El teléfono del cliente es obligatorio." },
    );
  }
});

test("acepta teléfonos con formato habitual y una cantidad razonable de dígitos", () => {
  for (const phone of [
    "+54 351 0123456",
    "011-4321-9876",
    "+1 (212) 555-0123",
  ]) {
    assert.equal(
      createCustomer({ ...validInput, phone }).phone,
      phone,
    );
  }
});

test("rechaza teléfonos con letras, símbolos inválidos o pocos dígitos", () => {
  for (const phone of [
    "351 ABC 1234",
    "+54/351/0123456",
    "123456",
  ]) {
    assert.throws(
      () => createCustomer({ ...validInput, phone }),
      { message: /teléfono.*al menos 7 dígitos/ },
    );
  }
});

test("permite crear clientes diferentes con el mismo teléfono", () => {
  const first = createCustomer(validInput);

  const second = createCustomer({
    ...validInput,
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Luis Pérez",
  });

  assert.notEqual(first.id, second.id);
  assert.equal(first.phone, second.phone);
});