import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  createInternalUser,
} from "../../src/modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

const BASE_URL =
  process.env.BASE_URL ?? "http://127.0.0.1:3000";

const ACTIVE_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_APPROVAL",
  "IN_REPAIR",
  "READY_FOR_PICKUP",
  "AWAITING_PICKUP_UNREPAIRED",
  "RECEIVED",
  "IN_REPAIR",
  "RECEIVED",
  "DIAGNOSING",
  "IN_REPAIR",
  "RECEIVED",
] as const;

test("protege y calcula correctamente el dashboard", async () => {
  const username = `dashboard-${randomUUID()}`;
  const password = "Password-Test-123!";
  const userRepository = new PrismaInternalAuthRepository();
  const now = new Date();
  const customerId = randomUUID();
  const machineIds: string[] = [];
  const repairIds: string[] = [];
  let userId: string | undefined;

  try {
    const user = await createInternalUser(
      {
        username,
        displayName: "Usuario dashboard",
        password,
        role: "ADMIN",
      },
      userRepository,
    );

    userId = user.id;

    await prisma.customer.create({
      data: {
        id: customerId,
        name: "Cliente Dashboard",
        lastName: "Prueba",
        dni: randomInt(10000000, 99999999).toString(),
        phone: `351${Date.now()}${randomInt(100, 999)}`,
        email: null,
        address: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    const loginResponse = await fetch(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      },
    );

    assert.equal(loginResponse.status, 200);

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);
    const authenticatedHeaders = {
      Cookie: setCookie.split(";", 1)[0],
    };

    for (const [index, status] of ACTIVE_STATUSES.entries()) {
      const repairId = randomUUID();
      const machineId = randomUUID();
      machineIds.push(machineId);
      repairIds.push(repairId);
      const timestamp = new Date(
        now.getTime() + index * 1000,
      );

      await prisma.machine.create({
        data: {
          id: machineId,
          customerId,
          brand: "Singer",
          type: "Recta",
          model: "Modelo Dashboard",
          serialNumber: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.repairOrder.create({
        data: {
          id: repairId,
          machineId,
          reportedIssue: `Problema dashboard ${index}`,
          receivedAccessories: null,
          status,
          receivedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    }

    for (const status of ["DELIVERED", "CANCELLED"] as const) {
      const repairId = randomUUID();
      const machineId = randomUUID();
      machineIds.push(machineId);
      repairIds.push(repairId);

      await prisma.machine.create({
        data: {
          id: machineId,
          customerId,
          brand: "Singer",
          type: "Recta",
          model: "Modelo Dashboard",
          serialNumber: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.repairOrder.create({
        data: {
          id: repairId,
          machineId,
          reportedIssue: `Finalizada ${status}`,
          receivedAccessories: null,
          status,
          receivedAt: now,
          createdAt: now,
          updatedAt: new Date(now.getTime() + 20000),
        },
      });
    }

    const unauthenticatedResponse = await fetch(
      `${BASE_URL}/api/dashboard`,
    );

    assert.equal(unauthenticatedResponse.status, 401);

    const dashboardResponse = await fetch(
      `${BASE_URL}/api/dashboard`,
      { headers: authenticatedHeaders },
    );

    assert.equal(dashboardResponse.status, 200);

    const dashboard = await dashboardResponse.json();

    assert.ok(
      dashboard.activeRepairs >= ACTIVE_STATUSES.length,
    );
    assert.ok(dashboard.waitingApproval >= 1);
    assert.ok(dashboard.readyForPickup >= 1);
    assert.ok(dashboard.awaitingPickupUnrepaired >= 1);
    assert.equal(dashboard.recentRepairs.length, 10);
    assert.equal(
      dashboard.recentRepairs[0].id,
      repairIds[ACTIVE_STATUSES.length - 1],
    );
    assert.equal(
      dashboard.recentRepairs[1].id,
      repairIds[ACTIVE_STATUSES.length - 2],
    );
    assert.equal(
      dashboard.recentRepairs.some(
        (repair: { status: string }) =>
          repair.status === "DELIVERED" ||
          repair.status === "CANCELLED",
      ),
      false,
    );

    const recentRepair = dashboard.recentRepairs[0];
    assert.deepEqual(recentRepair.machine, {
      brand: "Singer",
      type: "Recta",
      model: "Modelo Dashboard",
      customer: {
        id: customerId,
        name: "Cliente Dashboard",
        lastName: "Prueba",
      },
    });
  } finally {
    await prisma.repairOrder.deleteMany({
      where: { id: { in: repairIds } },
    });

    await prisma.machine.deleteMany({
      where: { id: { in: machineIds } },
    });

    await prisma.customer.deleteMany({
      where: { id: customerId },
    });

    if (userId) {
      await prisma.internalSession.deleteMany({
        where: { userId },
      });

      await prisma.internalUser.delete({
        where: { id: userId },
      });
    }

    await prisma.$disconnect();
  }
});
