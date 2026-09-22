import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

test("protege las APIs internas y permite operar con sesión", async () => {
  const username = `security-${randomUUID()}`;
  const password = "Password-Test-123!";
  const userRepository = new PrismaInternalAuthRepository();
  let userId: string | undefined;

  try {
    const user = await createInternalUser(
      {
        username,
        displayName: "Usuario de seguridad",
        password,
        role: "ADMIN",
      },
      userRepository,
    );

    userId = user.id;

    const invalidLoginResponse = await fetch(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: "contraseña-incorrecta",
        }),
      },
    );

    assert.equal(invalidLoginResponse.status, 401);

    const loginResponse = await fetch(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
    );

    assert.equal(loginResponse.status, 200);

    const loginBody = await loginResponse.json();
    assert.equal(loginBody.user.username, username);
    assert.equal("passwordHash" in loginBody.user, false);
    assert.equal("tokenHash" in loginBody.user, false);

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);
    const sessionCookie = setCookie.split(";", 1)[0];
    const authenticatedHeaders = { Cookie: sessionCookie };

    const unauthenticatedRequests = [
      fetch(`${BASE_URL}/api/auth/me`),
      fetch(`${BASE_URL}/api/customers?search=security`),
      fetch(`${BASE_URL}/api/machines`, { method: "POST" }),
      fetch(`${BASE_URL}/api/repairs`),
      fetch(`${BASE_URL}/api/quotes/${randomUUID()}/decision`, {
        method: "POST",
      }),
      fetch(`${BASE_URL}/api/repairs/${randomUUID()}/payments`, {
        method: "POST",
      }),
      fetch(`${BASE_URL}/api/repairs/${randomUUID()}/diagnosis`, {
        method: "POST",
      }),
    ];

    const unauthenticatedResponses =
      await Promise.all(unauthenticatedRequests);

    for (const response of unauthenticatedResponses) {
      assert.equal(response.status, 401);
    }

    const meResponse = await fetch(
      `${BASE_URL}/api/auth/me`,
      { headers: authenticatedHeaders },
    );

    assert.equal(meResponse.status, 200);
    const meBody = await meResponse.json();
    assert.equal(meBody.user.id, userId);
    assert.equal("passwordHash" in meBody.user, false);
    assert.equal("tokenHash" in meBody.user, false);

    const authenticatedSearchResponse = await fetch(
      `${BASE_URL}/api/customers?search=security`,
      { headers: authenticatedHeaders },
    );

    assert.equal(authenticatedSearchResponse.status, 200);

    const logoutResponse = await fetch(
      `${BASE_URL}/api/auth/logout`,
      {
        method: "POST",
        headers: authenticatedHeaders,
      },
    );

    assert.equal(logoutResponse.status, 200);

    const repeatedLogoutResponse = await fetch(
      `${BASE_URL}/api/auth/logout`,
      { method: "POST" },
    );

    assert.equal(repeatedLogoutResponse.status, 200);
  } finally {
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
