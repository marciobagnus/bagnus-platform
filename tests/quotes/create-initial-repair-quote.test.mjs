
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

import {
  createInitialRepairQuote,
} from "../../src/modules/quotes/application/create-initial-repair-quote.ts";

function createFakeRepository() {
  const quotes = [];

  return {
    quotes,

    async addInitialQuote(quote) {
      quotes.push(quote);
    },
  };
}

function validInput() {
  return {
    repairOrderId: randomUUID(),
    description: "  Reparación del sistema de arrastre.  ",
    totalAmount: "45000.00",
  };
}

test("crea y envia un presupuesto inicial", async () => {
  const repository = createFakeRepository();

  const quote = await createInitialRepairQuote(
    validInput(),
    repository,
  );

  assert.equal(quote.version, 1);
  assert.equal(quote.status, "WAITING_APPROVAL");

  assert.equal(
    quote.description,
    "Reparación del sistema de arrastre.",
  );

  assert.equal(quote.totalAmount, "45000.00");
  assert.equal(quote.currency, "ARS");

  assert.ok(quote.createdAt instanceof Date);

  assert.deepEqual(
    quote.createdAt,
    quote.updatedAt,
  );

  assert.equal(repository.quotes.length, 1);
  assert.deepEqual(repository.quotes[0], quote);
});

test("rechaza un identificador de reparación inválido", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    createInitialRepairQuote(
      {
        ...validInput(),
        repairOrderId: "12345",
      },
      repository,
    ),
    /identificador de la reparación no es válido/,
  );

  assert.equal(repository.quotes.length, 0);
});

test("rechaza un presupuesto sin descripción", async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    createInitialRepairQuote(
      {
        ...validInput(),
        description: "   ",
      },
      repository,
    ),
    /descripción del presupuesto es obligatoria/,
  );

  assert.equal(repository.quotes.length, 0);
});

test("rechaza importes inválidos", async () => {
  const invalidAmounts = [
    "0",
    "-100",
    "12.345",
    "abc",
    "",
    "10000000000",
  ];

  for (const totalAmount of invalidAmounts) {
    const repository = createFakeRepository();

    await assert.rejects(
      createInitialRepairQuote(
        {
          ...validInput(),
          totalAmount,
        },
        repository,
      ),
      /importe debe ser un valor positivo/,
    );

    assert.equal(repository.quotes.length, 0);
  }
});

test("propaga los errores del repositorio", async () => {
  const repository = {
    async addInitialQuote() {
      throw new Error("Error de persistencia");
    },
  };

  await assert.rejects(
    createInitialRepairQuote(
      validInput(),
      repository,
    ),
    /Error de persistencia/,
  );
});