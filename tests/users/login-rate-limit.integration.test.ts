import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import {
  createInternalUser,
  InvalidCredentialsError,
  LoginRateLimitExceededError,
  loginInternalUserWithRateLimit,
} from "../../src/modules/users/application/internal-auth.ts";
import {
  createLoginAttemptKeyHash,
  LOGIN_BLOCK_DURATION_MS,
} from "../../src/modules/users/domain/login-rate-limit.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

test("el límite persiste entre repositorios y serializa fallos concurrentes", async () => {
  const username = `rate-${randomUUID()}`;
  const origin = "203.0.113.10";
  const keyHash = createLoginAttemptKeyHash(username, origin);
  const firstRepository = new PrismaInternalAuthRepository();
  const secondRepository = new PrismaInternalAuthRepository();
  let userId: string | undefined;

  try {
    const user = await createInternalUser(
      {
        username,
        displayName: "Usuario rate limit",
        password: "secret6",
        role: "STAFF",
      },
      firstRepository,
    );
    userId = user.id;

    const start = new Date("2026-09-23T12:00:00.000Z");
    const invalidInput = {
      username,
      password: "wrong6",
    };

    for (let count = 0; count < 4; count += 1) {
      await assert.rejects(
        loginInternalUserWithRateLimit(
          invalidInput,
          firstRepository,
          firstRepository,
          keyHash,
          () => start,
        ),
        InvalidCredentialsError,
      );
    }

    await assert.rejects(
      loginInternalUserWithRateLimit(
        invalidInput,
        secondRepository,
        secondRepository,
        keyHash,
        () => start,
      ),
      LoginRateLimitExceededError,
    );

    const concurrentResults = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        loginInternalUserWithRateLimit(
          invalidInput,
          firstRepository,
          firstRepository,
          keyHash,
          () => start,
        ),
      ),
    );
    const bucket = await prisma.internalLoginAttemptBucket.findUnique({
      where: { keyHash },
    });

    assert.equal(bucket?.failedAttempts, 5);
    assert.ok(
      concurrentResults.some(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof LoginRateLimitExceededError,
      ),
    );

    const afterBlock = new Date(start.getTime() + LOGIN_BLOCK_DURATION_MS + 1);
    const login = await loginInternalUserWithRateLimit(
      { username, password: "secret6" },
      firstRepository,
      firstRepository,
      keyHash,
      () => afterBlock,
    );

    assert.equal(login.user.id, user.id);
    assert.equal(
      await prisma.internalLoginAttemptBucket.findUnique({ where: { keyHash } }),
      null,
    );
  } finally {
    await prisma.internalLoginAttemptBucket.deleteMany({ where: { keyHash } });

    if (userId) {
      await prisma.internalSession.deleteMany({ where: { userId } });
      await prisma.internalUser.delete({ where: { id: userId } });
    }

    await prisma.$disconnect();
  }
});
