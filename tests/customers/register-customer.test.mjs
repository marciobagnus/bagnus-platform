
import assert from "node:assert/strict";
import { test } from "node:test";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

// Datos válidos reutilizables para las pruebas.
function validCustomerInput() {
  return {
    name: "  Juan  ",
    lastName: "  Pérez  ",
    dni: " 30.123.456 ",
    phone: " 3515550101 ",
    email: " JUAN@EXAMPLE.COM ",
    address: " Córdoba, Argentina ",
  };
}

// Repositorio simulado: no necesita conectarse a PostgreSQL.
function createFakeRepository() {
  const customers = [];

  return {
    customers,

    async add(customer) {
      customers.push(customer);
    },
  };
}

test("registra un cliente con todos sus datos normalizados", async () => {
  const repository = createFakeRepository();

  const customer = await registerCustomer(
    validCustomerInput(),
    repository,
  );

  assert.match(
  customer.id,
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);

  assert.equal(customer.name, "Juan");
  assert.equal(customer.lastName, "Pérez");
  assert.equal(customer.dni, "30123456");
  assert.equal(customer.phone, "3515550101");

  assert.equal(customer.email, "juan@example.com");
  assert.equal(customer.address, "Córdoba, Argentina");

  assert.ok(customer.createdAt instanceof Date);
  assert.ok(customer.updatedAt instanceof Date);

  assert.deepEqual(customer.createdAt, customer.updatedAt);

  // Verificamos que el repositorio recibió el mismo cliente.
  assert.equal(repository.customers.length, 1);

  assert.deepEqual(repository.customers[0], customer);
});

test("rechaza datos obligatorios o formatos inválidos", async () => {
  const invalidCases = [
    {
      field: "name",
      value: "   ",
      error: /nombre.*obligatorio/,
    },
    {
      field: "lastName",
      value: "   ",
      error: /apellido.*obligatorio/,
    },
    {
      field: "dni",
      value: "12ABC456",
      error: /DNI/,
    },
    {
      field: "phone",
      value: "   ",
      error: /teléfono.*obligatorio/,
    },
    {
      field: "email",
      value: "correo-invalido",
      error: /correo electrónico no es válido/,
    },
  ];

  for (const invalidCase of invalidCases) {
    const repository = createFakeRepository();

    const input = {
      ...validCustomerInput(),
      [invalidCase.field]: invalidCase.value,
    };

    await assert.rejects(
      registerCustomer(input, repository),
      invalidCase.error,
      `Debería rechazar el campo ${invalidCase.field}`,
    );

    // Ningún cliente inválido debe llegar al repositorio.
    assert.equal(repository.customers.length, 0);
  }
});

test("permite registrar un cliente sin email ni dirección", async () => {
  const repository = createFakeRepository();

  const customer = await registerCustomer(
    {
      name: "María",
      lastName: "Gómez",
      dni: "28456789",
      phone: "3515550202",
    },
    repository,
  );

  assert.equal(customer.email, null);
  assert.equal(customer.address, null);

  assert.equal(repository.customers.length, 1);
});

test("propaga el error cuando falla el repositorio", async () => {
  const repository = {
    async add() {
      throw new Error("Error de persistencia");
    },
  };

  await assert.rejects(
    registerCustomer(validCustomerInput(), repository),
    /Error de persistencia/,
  );
});

test("permite registrar un cliente sin DNI", async () => {
  const repository = createFakeRepository();

  const customer = await registerCustomer(
    {
      ...validCustomerInput(),
      dni: "   ",
    },
    repository,
  );

  assert.equal(customer.dni, null);
});