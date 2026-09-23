import assert from "node:assert/strict";
import { test } from "node:test";

import { updateCustomer } from "../../src/modules/customers/application/update-customer.ts";

function createFakeRepository() {
  return {
    updated: [],
    async update(customer) {
      this.updated.push(customer);
    },
  };
}

test("actualiza y normaliza los datos permitidos del cliente", async () => {
  const repository = createFakeRepository();
  const customer = await updateCustomer(
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "  Ana ",
      lastName: " Pérez ",
      dni: " ",
      phone: " +54 9 351 5550101 ",
      email: " ANA@EXAMPLE.COM ",
      address: " ",
    },
    repository,
  );

  assert.equal(customer.name, "Ana");
  assert.equal(customer.dni, null);
  assert.equal(customer.phone, "5493515550101");
  assert.equal(customer.email, "ana@example.com");
  assert.equal(customer.address, null);
  assert.equal(repository.updated.length, 1);
});

test("rechaza datos inválidos sin actualizar el repositorio", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    updateCustomer(
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Ana",
        lastName: "Pérez",
        dni: "ABC",
        phone: "3515550101",
      },
      repository,
    ),
    /DNI.*únicamente números/,
  );

  assert.equal(repository.updated.length, 0);
});