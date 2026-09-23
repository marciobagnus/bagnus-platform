import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import { createInternalUser } from "../../src/modules/users/application/internal-auth.ts";
import { createLoginAttemptKeyHash } from "../../src/modules/users/domain/login-rate-limit.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test("el endpoint responde 429 después de cinco fallos", async () => {
  const username = `api-rate-${randomUUID()}`;
  const origin = "198.51.100.20";
  const keyHash = createLoginAttemptKeyHash(username, origin);
  const repository = new PrismaInternalAuthRepository();
  let userId: string | undefined;

  try {
    const user = await createInternalUser(
      {
        username,
        displayName: "Usuario API rate limit",
        password: "secret6",
        role: "STAFF",
      },
      repository,
    );
    userId = user.id;

    const responses = [];
    for (let count = 0; count < 5; count += 1) {
      responses.push(
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": origin,
          },
          body: JSON.stringify({ username, password: "wrong6" }),
        }),
      );
    }

    assert.deepEqual(
      responses.map((response) => response.status),
      [401, 401, 401, 401, 429],
    );
    const body = await responses[4].json();
    assert.equal(
      body.error,
      "Demasiados intentos de inicio de sesión. Intentá nuevamente en unos minutos.",
    );
    assert.ok(responses[4].headers.get("retry-after"));
  } finally {
    await prisma.internalLoginAttemptBucket.deleteMany({ where: { keyHash } });

    if (userId) {
      await prisma.internalSession.deleteMany({ where: { userId } });
      await prisma.internalUser.delete({ where: { id: userId } });
    }

    await prisma.$disconnect();
  }
});
