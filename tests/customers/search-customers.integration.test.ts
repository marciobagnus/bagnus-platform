
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { searchCustomers } from "../../src/modules/customers/application/search-customers.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { PrismaCustomerSearchRepository } from "../../src/modules/customers/infrastructure/prisma-customer-search-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("busca clientes reales por sus diferentes datos", async () => {
  const registrationRepository =
    new PrismaCustomerRepository();

  const searchRepository =
    new PrismaCustomerSearchRepository();

  // Generamos datos exclusivos para esta ejecución.
  const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);

  const name = `Busqueda${uniqueId}`;
  const lastName = `Apellido${uniqueId}`;

  const dni = randomInt(10000000, 99999999).toString();

  const phone = `351${Date.now()}${randomInt(100, 999)}`;

  const email = `busqueda.${uniqueId}@example.com`;

  let customerId: string | undefined;

  try {
    // 1. Registrar un cliente real.
    const customer = await registerCustomer(
      {
        name,
        lastName,
        dni,
        phone,
        email,
      },
      registrationRepository,
    );

    customerId = customer.id;

    // 2. Buscarlo utilizando diferentes criterios.
    const searchQueries = [
      name.toUpperCase(),
      lastName.toUpperCase(),
      dni,
      phone,
      email.toUpperCase(),
    ];

    for (const query of searchQueries) {
      const results = await searchCustomers(
        query,
        searchRepository,
      );

      const found = results.find(
        (result) => result.id === customer.id,
      );

      assert.ok(
        found,
        `No se encontró al cliente buscando: ${query}`,
      );

      assert.equal(found.name, name);
      assert.equal(found.lastName, lastName);
      assert.equal(found.phone, phone);
    }

    // 3. Verificar que también acepta DNI con puntos.
    const formattedDni =
      `${dni.slice(0, 2)}.${dni.slice(2, 5)}.${dni.slice(5)}`;

    const resultsByDni = await searchCustomers(
      formattedDni,
      searchRepository,
    );

    assert.ok(
      resultsByDni.some(
        (result) => result.id === customer.id,
      ),
      "No se encontró al cliente buscando el DNI con puntos",
    );

    // 4. Verificar que la búsqueda no devuelve datos
    // innecesarios de identificación o contacto.
    const results = await searchCustomers(
      name,
      searchRepository,
    );

    const found = results.find(
      (result) => result.id === customer.id,
    );

    assert.ok(found);

    assert.equal("dni" in found, false);
    assert.equal("email" in found, false);

  } finally {
    // Eliminar únicamente el cliente creado por este test.
    if (customerId) {
      await prisma.customer.deleteMany({
        where: {
          id: customerId,
        },
      });
    }

    await prisma.$disconnect();
  }
});