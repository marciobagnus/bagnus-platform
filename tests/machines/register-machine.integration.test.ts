
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { registerCustomer } from "../../src/modules/customers/application/register-customer.ts";

import { registerMachine } from "../../src/modules/machines/application/register-machine.ts";

import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer-repository.ts";

import { PrismaMachineRepository } from "../../src/modules/machines/infrastructure/prisma-machine-repository.ts";

import { prisma } from "../../src/lib/prisma.ts";

test("registra máquinas asociadas a un cliente existente", async () => {
  const customerRepository = new PrismaCustomerRepository();
  const machineRepository = new PrismaMachineRepository();

  let customerId: string | undefined;

  try {
    // 1. Crear un cliente de prueba.
    const customer = await registerCustomer(
      {
        name: "Cliente",
        lastName: "Prueba Maquinas",
        dni: randomInt(10000000, 100000000).toString(),
        phone: `351${randomUUID().replace(/\D/g, "")}${Date.now()}`,
      },
      customerRepository,
    );

    customerId = customer.id;

    // 2. Registrar la primera máquina.
    const machine1 = await registerMachine(
      {
        customerId: customer.id,
        brand: "Singer",
        type: "Recta",
        model: "Heavy Duty 4423",
        serialNumber: "SN-TEST-001",
      },
      machineRepository,
    );

    // 3. Registrar otra máquina del mismo cliente.
    const machine2 = await registerMachine(
      {
        customerId: customer.id,
        brand: "Brother",
        type: "Overlock",
      },
      machineRepository,
    );

    // 4. Verificar que ambas máquinas existen.
    const savedMachines = await prisma.machine.findMany({
      where: {
        customerId: customer.id,
      },
    });

    assert.equal(savedMachines.length, 2);

    const savedMachine1 = savedMachines.find(
      (machine) => machine.id === machine1.id,
    );

    const savedMachine2 = savedMachines.find(
      (machine) => machine.id === machine2.id,
    );

    assert.ok(savedMachine1);
    assert.ok(savedMachine2);

    // 5. Verificar la primera máquina.
    assert.equal(savedMachine1.customerId, customer.id);
    assert.equal(savedMachine1.brand, "Singer");
    assert.equal(savedMachine1.type, "Recta");
    assert.equal(savedMachine1.model, "Heavy Duty 4423");
    assert.equal(savedMachine1.serialNumber, "SN-TEST-001");

    assert.deepEqual(
      savedMachine1.createdAt,
      machine1.createdAt,
    );

    // 6. Verificar que los campos opcionales
    // de la segunda máquina son nulos.
    assert.equal(savedMachine2.customerId, customer.id);
    assert.equal(savedMachine2.brand, "Brother");
    assert.equal(savedMachine2.model, null);
    assert.equal(savedMachine2.serialNumber, null);

    // 7. Verificar la relación desde Customer.
    const customerWithMachines =
      await prisma.customer.findUnique({
        where: {
          id: customer.id,
        },
        include: {
          machines: true,
        },
      });

    assert.ok(customerWithMachines);
    assert.equal(customerWithMachines.machines.length, 2);

    // 8. No debe poder registrarse una máquina
    // asociada a un cliente inexistente.
    await assert.rejects(
      registerMachine(
        {
          customerId: randomUUID(),
          brand: "Janome",
          type: "Recta",
        },
        machineRepository,
      ),
    );

  } finally {
    // Limpiar únicamente los registros de esta prueba.
    // Primero eliminamos las máquinas por la relación FK.
    if (customerId) {
      await prisma.machine.deleteMany({
        where: {
          customerId,
        },
      });

      await prisma.customer.deleteMany({
        where: {
          id: customerId,
        },
      });
    }

    await prisma.$disconnect();
  }
});