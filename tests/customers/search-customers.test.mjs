
import assert from "node:assert/strict";
import { test } from "node:test";

import { searchCustomers } from "../../src/modules/customers/application/search-customers.ts";

function createFakeRepository() {
  const calls = [];

  const customers = [
    {
      id: "customer-1",
      name: "Carlos",
      lastName: "Gomez",
      phone: "3515559876",
    },
  ];

  return {
    calls,

    async search(query, limit) {
      calls.push({ query, limit });
      return customers;
    },
  };
}

test("normaliza la búsqueda y limita los resultados a 20", async () => {
  const repository = createFakeRepository();

  const result = await searchCustomers(
    "  Carlos  ",
    repository,
  );

  assert.deepEqual(repository.calls, [
    {
      query: "Carlos",
      limit: 20,
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Carlos");
});

test("rechaza búsquedas demasiado cortas", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    searchCustomers(" A ", repository),
    /entre 2 y 100 caracteres/,
  );

  assert.equal(repository.calls.length, 0);
});

test("rechaza búsquedas demasiado largas", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    searchCustomers("A".repeat(101), repository),
    /entre 2 y 100 caracteres/,
  );

  assert.equal(repository.calls.length, 0);
});

test("acepta búsquedas de exactamente 2 y 100 caracteres", async () => {
  const repository = createFakeRepository();

  await searchCustomers("AB", repository);
  await searchCustomers("A".repeat(100), repository);

  assert.equal(repository.calls.length, 2);
});

test("propaga los errores del repositorio", async () => {
  const repository = {
    async search() {
      throw new Error("Error de PostgreSQL");
    },
  };

  await assert.rejects(
    searchCustomers("Carlos", repository),
    /Error de PostgreSQL/,
  );
});