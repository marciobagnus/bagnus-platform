import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

import { createInternalUser } from "../../src/modules/users/application/internal-auth.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";
import { prisma } from "../../src/lib/prisma.ts";

const BASE_URL = "http://127.0.0.1:3000";

test("edita un cliente y registra un ingreso coordinado mediante APIs autenticadas", async () => {
  const username = `test-${randomUUID()}`;
  const password = "Password-Test-123!";
  const userRepository = new PrismaInternalAuthRepository();
  let userId: string | undefined;
  let customerId: string | undefined;
  let conflictingCustomerId: string | undefined;
  let machineId: string | undefined;
  let repairId: string | undefined;
  const initialNationalPhone = `0351 15 ${String(Date.now()).slice(-7)}`;

  try {
    const user = await createInternalUser(
      {
        username,
        displayName: "Usuario de prueba edición e ingreso",
        password,
        role: "ADMIN",
      },
      userRepository,
    );
    userId = user.id;

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie");
    assert.ok(cookie);
    const authenticatedHeaders = {
      Cookie: cookie.split(";", 1)[0],
      "Content-Type": "application/json",
    };

    const createCustomerResponse = await fetch(`${BASE_URL}/api/customers`, {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        name: "Cliente",
        lastName: "Original",
        dni: "30123456",
        phone: initialNationalPhone,
      }),
    });
    const createdCustomer = await createCustomerResponse.json();
    customerId = createdCustomer.id;
    assert.equal(createCustomerResponse.status, 201);
    assert.match(createdCustomer.phone, /^549351\d{7}$/);

    const updateResponse = await fetch(
      `${BASE_URL}/api/customers/${customerId}`,
      {
        method: "PATCH",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          name: "Cliente actualizado",
          lastName: "Actualizado",
          dni: "",
          phone: "0351 15 7654321",
          email: "cliente@example.com",
          address: "Taller 123",
        }),
      },
    );
    const updatedCustomer = await updateResponse.json();
    assert.equal(updateResponse.status, 200);
    assert.equal(updatedCustomer.name, "Cliente actualizado");
    assert.equal(updatedCustomer.dni, null);
    assert.equal(updatedCustomer.phone, "5493517654321");
    assert.equal(updatedCustomer.email, "cliente@example.com");

    const partialUpdateResponse = await fetch(
      `${BASE_URL}/api/customers/${customerId}`,
      {
        method: "PATCH",
        headers: authenticatedHeaders,
        body: JSON.stringify({ name: "Cliente parcial" }),
      },
    );
    const partiallyUpdatedCustomer = await partialUpdateResponse.json();
    assert.equal(partialUpdateResponse.status, 200);
    assert.equal(partiallyUpdatedCustomer.phone, "5493517654321");
    assert.equal(partiallyUpdatedCustomer.email, "cliente@example.com");

    const conflictingCustomerResponse = await fetch(
      `${BASE_URL}/api/customers`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          name: "Cliente conflicto",
          lastName: "Test",
          dni: "30123457",
          phone: "+54 9 351 5550199",
        }),
      },
    );
    const conflictingCustomer = await conflictingCustomerResponse.json();
    conflictingCustomerId = conflictingCustomer.id;
    assert.equal(conflictingCustomerResponse.status, 201);

    const conflictResponse = await fetch(
      `${BASE_URL}/api/customers/${customerId}`,
      {
        method: "PATCH",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          name: "Cliente actualizado",
          lastName: "Actualizado",
          dni: "",
          phone: conflictingCustomer.phone,
          email: "cliente@example.com",
          address: "Taller 123",
        }),
      },
    );
    assert.equal(conflictResponse.status, 409);
    assert.match((await conflictResponse.json()).error, /otro cliente/);

    const intakeResponse = await fetch(`${BASE_URL}/api/machines/intake`, {
      method: "POST",
      headers: authenticatedHeaders,
      body: JSON.stringify({
        customerId,
        brand: "Singer",
        type: "Recta",
        model: "4423",
        reportedIssue: "No arrastra la tela.",
        receivedAccessories: "Pedal",
      }),
    });
    const intake = await intakeResponse.json();
    machineId = intake.machine.id;
    repairId = intake.repair.id;

    assert.equal(intakeResponse.status, 201);
    assert.equal(intake.repair.machineId, machineId);
    assert.equal(intake.repair.status, "RECEIVED");
  } finally {
    if (repairId) {
      await prisma.repairStatusHistory.deleteMany({ where: { repairOrderId: repairId } });
      await prisma.repairOrder.delete({ where: { id: repairId } });
    }
    if (machineId) {
      await prisma.machine.delete({ where: { id: machineId } });
    }
    if (customerId) {
      await prisma.customer.delete({ where: { id: customerId } });
    }
    if (conflictingCustomerId) {
      await prisma.customer.delete({ where: { id: conflictingCustomerId } });
    }
    if (userId) {
      await prisma.internalSession.deleteMany({ where: { userId } });
      await prisma.internalUser.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
});