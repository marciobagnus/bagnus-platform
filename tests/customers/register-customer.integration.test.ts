import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("registra un cliente completo en PostgreSQL", async () => {
  const repository = new PrismaCustomerRepository();

  // Generamos un teléfono y un DNI exclusivos para cada ejecución.
  // Así evitamos conflictos con registros de pruebas anteriores.
  const uniqueValue = randomUUID().replace(/\D/g, "").slice(0, 8);

  // Como un UUID podría contener pocos números, usamos
  // un valor aleatorio numérico de ocho dígitos.
  const dni = Math.floor(
    10000000 + Math.random() * 90000000,
  ).toString();

  const phone = `351${Date.now()}`;

  let customerId: string | undefined;

  try {
    // 1. Ejecutar el caso de uso.
    const customer = await registerCustomer(
      {
        name: "  Cliente  ",
        lastName: "  Prueba  ",
        dni: ` ${dni} `,
        phone: ` ${phone} `,
        email: "  CLIENTE.PRUEBA@EXAMPLE.COM  ",
        address: "  Córdoba, Argentina  ",
      },
      repository,
    );

    customerId = customer.id;

    // 2. Consultar el cliente directamente en PostgreSQL.
    const savedCustomer = await prisma.customer.findUnique({
      where: {
        id: customer.id,
      },
    });

    // 3. Verificar que existe.
    assert.ok(savedCustomer);

    // 4. Verificar los datos persistidos.
    assert.equal(savedCustomer.id, customer.id);
    assert.equal(savedCustomer.name, "Cliente");
    assert.equal(savedCustomer.lastName, "Prueba");
    assert.equal(savedCustomer.dni, dni);
    assert.equal(savedCustomer.phone, phone);

    assert.equal(
      savedCustomer.email,
      "cliente.prueba@example.com",
    );

    assert.equal(
      savedCustomer.address,
      "Córdoba, Argentina",
    );

    // 5. Verificar las fechas.
    assert.deepEqual(
      savedCustomer.createdAt,
      customer.createdAt,
    );

    assert.deepEqual(
      savedCustomer.updatedAt,
      customer.updatedAt,
    );
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