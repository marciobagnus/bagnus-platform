import assert from "node:assert/strict";
import { test } from "node:test";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("registra un cliente real en PostgreSQL", async () => {
  const repository = new PrismaCustomerRepository();

  let customerId: string | undefined;

  try {
    // 1. Ejecutar el caso de uso
    const customer = await registerCustomer(
      {
        name: "  Cliente de prueba  ",
        phone: "  3515550101  ",
      },
      repository,
    );

    customerId = customer.id;

    // 2. Buscar el cliente directamente en PostgreSQL
    const savedCustomer = await prisma.customer.findUnique({
      where: {
        id: customer.id,
      },
    });

    // 3. Comprobar que existe
    assert.ok(savedCustomer);

    // 4. Verificar que los datos son correctos
    assert.equal(savedCustomer.id, customer.id);

    assert.equal(savedCustomer.name, "Cliente de prueba");

    assert.equal(savedCustomer.phone, "3515550101");

    assert.deepEqual(
      savedCustomer.createdAt,
      customer.createdAt,
    );

    assert.deepEqual(
      savedCustomer.updatedAt,
      customer.updatedAt,
    );
  } finally {
    // Eliminar únicamente el cliente creado por este test
    if (customerId) {
      await prisma.customer.deleteMany({
        where: {
          id: customerId,
        },
      });
    }

    // Cerrar la conexión con PostgreSQL
    await prisma.$disconnect();
  }
});