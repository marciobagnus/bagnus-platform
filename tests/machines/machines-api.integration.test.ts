
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

const BASE_URL = "http://127.0.0.1:3000";

test("la API registra y consulta máquinas de un cliente", async () => {
  const repository = new PrismaCustomerRepository();

  let customerId: string | undefined;

  try {
    // 1. Crear un cliente exclusivo para el test.

    const customer = await registerCustomer(
      {
        name: "Cliente",
        lastName: "Test API Machines",
        dni: randomInt(10000000, 100000000).toString(),
        phone: `351${Date.now()}${randomInt(1000, 9999)}`,
      },
      repository,
    );

    customerId = customer.id;

    const url =
      `${BASE_URL}/api/customers/${customerId}/machines`;

    // 2. El cliente todavía no tiene máquinas.

    const emptyResponse = await fetch(url);

    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(await emptyResponse.json(), []);

    // 3. Registrar una máquina mediante la API.

    const registerResponse = await fetch(
      `${BASE_URL}/api/machines`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          brand: "  Singer  ",
          type: "  Recta  ",
          model: "Heavy Duty 4423",
        }),
      },
    );

    const createdMachine = await registerResponse.json();

    assert.equal(
      registerResponse.status,
      201,
      JSON.stringify(createdMachine),
    );

    assert.match(createdMachine.id, /^[0-9a-f-]{36}$/);
    assert.equal(createdMachine.customerId, customerId);
    assert.equal(createdMachine.brand, "Singer");
    assert.equal(createdMachine.type, "Recta");
    assert.equal(createdMachine.serialNumber, null);

    // 4. Consultar las máquinas mediante la API.

    const listResponse = await fetch(url);

    assert.equal(listResponse.status, 200);

    const machines = await listResponse.json();

    assert.equal(machines.length, 1);
    assert.equal(machines[0].id, createdMachine.id);
    assert.equal(machines[0].customerId, customerId);
    assert.equal(machines[0].brand, "Singer");

    // 5. Un cliente inexistente devuelve 404.

    const notFoundResponse = await fetch(
      `${BASE_URL}/api/customers/${randomUUID()}/machines`,
    );

    assert.equal(notFoundResponse.status, 404);

    // 6. Un identificador inválido devuelve 400.

    const invalidResponse = await fetch(
      `${BASE_URL}/api/customers/identificador-invalido/machines`,
    );

    assert.equal(invalidResponse.status, 400);

  } finally {

    // Eliminar solamente los datos creados por este test.

    if (customerId) {
      await prisma.machine.deleteMany({
        where: { customerId },
      });

      await prisma.customer.delete({
        where: { id: customerId },
      });
    }

    await prisma.$disconnect();
  }
});