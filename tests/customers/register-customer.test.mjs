import test from "node:test";
import assert from "node:assert/strict";
import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

test("registra un cliente con UUID, fechas y datos normalizados", async () => {
  const savedCustomers = [];

  const repository = {
    async add(customer) {
      savedCustomers.push(customer);
    },
  };

  const customer = await registerCustomer(
    {
      name: "  Ana Pérez  ",
      phone: "  +54 351 0123456  ",
    },
    repository,
  );

  assert.equal(customer.name, "Ana Pérez");
  assert.equal(customer.phone, "+54 351 0123456");

  // Comprueba que el identificador tenga formato UUID v4.
  assert.match(
    customer.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  assert.ok(customer.createdAt instanceof Date);
  assert.ok(Number.isFinite(customer.createdAt.getTime()));
  assert.ok(customer.updatedAt instanceof Date);
  assert.equal(
    customer.createdAt.getTime(),
    customer.updatedAt.getTime(),
  );

  // Debe guardar exactamente una vez y devolver el cliente guardado.
  assert.equal(savedCustomers.length, 1);
  assert.deepEqual(savedCustomers[0], customer);
});

test("no intenta guardar cuando el nombre es inválido", async () => {
  let saveCalls = 0;

  const repository = {
    async add() {
      saveCalls += 1;
    },
  };

  await assert.rejects(
    () =>
      registerCustomer(
        { name: "   ", phone: "+54 351 0123456" },
        repository,
      ),
    { message: "El nombre del cliente es obligatorio." },
  );

  assert.equal(saveCalls, 0);
});

test("no intenta guardar cuando el teléfono es inválido", async () => {
  let saveCalls = 0;

  const repository = {
    async add() {
      saveCalls += 1;
    },
  };

  await assert.rejects(
    () =>
      registerCustomer(
        { name: "Ana Pérez", phone: "   " },
        repository,
      ),
    { message: "El teléfono del cliente es obligatorio." },
  );

  assert.equal(saveCalls, 0);
});

test("propaga el error si falla el guardado", async () => {
  const storageError = new Error("No se pudo guardar el cliente.");

  const repository = {
    async add() {
      throw storageError;
    },
  };

  await assert.rejects(
    () =>
      registerCustomer(
        { name: "Ana Pérez", phone: "+54 351 0123456" },
        repository,
      ),
    (error) => error === storageError,
  );
});