import assert from "node:assert/strict";
import { test } from "node:test";

import {
  InvalidCredentialsError,
  LoginRateLimitExceededError,
  loginInternalUserWithRateLimit,
} from "../../src/modules/users/application/internal-auth.ts";
import {
  createLoginAttemptKeyHash,
  LOGIN_BLOCK_DURATION_MS,
  LOGIN_FAILURE_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
} from "../../src/modules/users/domain/login-rate-limit.ts";
import { hashPassword } from "../../src/modules/users/domain/password.ts";

const validPassword = "secret6";
const storedHash = await hashPassword(validPassword);

function createAuthRepository() {
  return {
    sessions: [],
    async findActiveUserByUsername(username) {
      if (username === "admin") {
        return {
          id: "admin-id",
          username: "admin",
          displayName: "Admin",
          passwordHash: storedHash,
          role: "ADMIN",
        };
      }

      return null;
    },
    async createSession(session) {
      this.sessions.push(session);
    },
  };
}

function createAttemptRepository() {
  const states = new Map();

  return {
    states,
    async getLoginAttemptState(keyHash) {
      return states.get(keyHash) ?? null;
    },
    async registerLoginFailure(keyHash, now) {
      const current = states.get(keyHash);

      if (current?.blockedUntil && current.blockedUntil > now) {
        return current;
      }

      const windowExpired = current &&
        now.getTime() - current.windowStartedAt.getTime() >= LOGIN_FAILURE_WINDOW_MS;
      const failedAttempts = current
        ? windowExpired ? 1 : current.failedAttempts + 1
        : 1;
      const blockedUntil = failedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_BLOCK_DURATION_MS)
        : null;
      const state = {
        failedAttempts,
        blockedUntil,
        windowStartedAt: windowExpired || !current
          ? now
          : current.windowStartedAt,
      };
      states.set(keyHash, state);
      return state;
    },
    async resetLoginFailures(keyHash) {
      states.delete(keyHash);
    },
  };
}

function callLogin({ auth, attempts, username = "admin", password = "wrong6", origin = "203.0.113.10", clock }) {
  return loginInternalUserWithRateLimit(
    { username, password },
    auth,
    attempts,
    createLoginAttemptKeyHash(username, origin),
    clock,
  );
}

test("limita cinco fallos y responde bloqueado durante quince minutos", async () => {
  const auth = createAuthRepository();
  const attempts = createAttemptRepository();
  let now = new Date("2026-09-23T12:00:00.000Z");
  const clock = () => now;

  for (let count = 1; count < LOGIN_MAX_FAILED_ATTEMPTS; count += 1) {
    await assert.rejects(
      callLogin({ auth, attempts, clock }),
      InvalidCredentialsError,
    );
  }

  await assert.rejects(
    callLogin({ auth, attempts, clock }),
    LoginRateLimitExceededError,
  );
  await assert.rejects(
    callLogin({ auth, attempts, clock }),
    LoginRateLimitExceededError,
  );

  now = new Date(now.getTime() + LOGIN_BLOCK_DURATION_MS + 1);
  await assert.rejects(
    callLogin({ auth, attempts, clock }),
    InvalidCredentialsError,
  );
});

test("un login exitoso reinicia el contador de fallos", async () => {
  const auth = createAuthRepository();
  const attempts = createAttemptRepository();
  const clock = () => new Date("2026-09-23T12:00:00.000Z");

  for (let count = 0; count < 4; count += 1) {
    await assert.rejects(
      callLogin({ auth, attempts, clock }),
      InvalidCredentialsError,
    );
  }

  const result = await callLogin({
    auth,
    attempts,
    password: validPassword,
    clock,
  });

  assert.equal(result.user.username, "admin");
  assert.equal(attempts.states.size, 0);
});

test("los usuarios inexistentes reciben el mismo tratamiento y no revelan datos", async () => {
  const auth = createAuthRepository();
  const attempts = createAttemptRepository();
  const clock = () => new Date("2026-09-23T12:00:00.000Z");

  await assert.rejects(
    callLogin({ auth, attempts, username: "no-existe", clock }),
    InvalidCredentialsError,
  );

  const keyHash = createLoginAttemptKeyHash("no-existe", "203.0.113.10");
  assert.equal(attempts.states.get(keyHash).failedAttempts, 1);
  assert.equal(keyHash.includes("no-existe"), false);
});

test("orígenes diferentes usan buckets diferentes y comparten el estado entre repositorios", async () => {
  const auth = createAuthRepository();
  const firstInstance = createAttemptRepository();
  const secondInstance = firstInstance;
  const clock = () => new Date("2026-09-23T12:00:00.000Z");

  for (let count = 0; count < 3; count += 1) {
    await assert.rejects(
      callLogin({ auth, attempts: firstInstance, origin: "203.0.113.10", clock }),
      InvalidCredentialsError,
    );
  }

  await assert.rejects(
    callLogin({ auth, attempts: secondInstance, origin: "203.0.113.10", clock }),
    InvalidCredentialsError,
  );
  await assert.rejects(
    callLogin({ auth, attempts: secondInstance, origin: "203.0.113.10", clock }),
    LoginRateLimitExceededError,
  );

  await assert.rejects(
    callLogin({ auth, attempts: secondInstance, origin: "198.51.100.20", clock }),
    InvalidCredentialsError,
  );
});

test("las solicitudes concurrentes no superan el umbral lógico", async () => {
  const auth = createAuthRepository();
  const attempts = createAttemptRepository();
  const clock = () => new Date("2026-09-23T12:00:00.000Z");

  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      callLogin({ auth, attempts, clock }),
    ),
  );

  const keyHash = createLoginAttemptKeyHash("admin", "203.0.113.10");
  assert.equal(attempts.states.get(keyHash).failedAttempts, 5);
  assert.equal(
    results.filter((result) => result.status === "rejected" && result.reason instanceof LoginRateLimitExceededError).length,
    16,
  );
});
