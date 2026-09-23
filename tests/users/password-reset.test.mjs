import assert from "node:assert/strict";
import { test } from "node:test";

import {
  InternalUserNotFoundError,
  PasswordConfirmationMismatchError,
  resetInternalUserPassword,
  UnauthorizedPasswordResetError,
} from "../../src/modules/users/application/internal-auth.ts";
import { verifyPassword } from "../../src/modules/users/domain/password.ts";

function createRepository() {
  const calls = [];
  const user = {
    id: "target-user",
    username: "empleado",
    displayName: "Empleado",
    role: "STAFF",
  };

  return {
    calls,
    async findUserByUsername(username) {
      return username === user.username ? user : null;
    },
    async resetUserPassword(input) {
      calls.push(input);
    },
  };
}

test("solo ADMIN puede restablecer una contraseña y la operación usa un hash", async () => {
  const repository = createRepository();

  await resetInternalUserPassword(
    {
      actor: {
        id: "admin-user",
        username: "admin",
        displayName: "Administrador",
        role: "ADMIN",
      },
      username: " EMPLEADO ",
      password: "abcdef",
      passwordConfirmation: "abcdef",
    },
    repository,
  );

  assert.equal(repository.calls.length, 1);
  assert.equal(repository.calls[0].targetUserId, "target-user");
  assert.equal(repository.calls[0].performedByUserId, "admin-user");
  assert.equal("password" in repository.calls[0], false);
  assert.equal(
    await verifyPassword(
      "abcdef",
      repository.calls[0].passwordHash,
    ),
    true,
  );
});

test("STAFF no puede ejecutar el caso de uso", async () => {
  await assert.rejects(
    resetInternalUserPassword(
      {
        actor: {
          id: "staff-user",
          username: "empleado",
          displayName: "Empleado",
          role: "STAFF",
        },
        username: "empleado",
        password: "Nueva-Password-123!",
        passwordConfirmation: "Nueva-Password-123!",
      },
      createRepository(),
    ),
    UnauthorizedPasswordResetError,
  );
});

test("valida usuario, confirmación y reglas de contraseña", async () => {
  const repository = createRepository();
  const actor = {
    id: "admin-user",
    username: "admin",
    displayName: "Administrador",
    role: "ADMIN",
  };

  await assert.rejects(
    resetInternalUserPassword(
      { actor, username: "desconocido", password: "abcdef", passwordConfirmation: "abcdef" },
      repository,
    ),
    InternalUserNotFoundError,
  );

  await assert.rejects(
    resetInternalUserPassword(
      { actor, username: "empleado", password: "abcdef", passwordConfirmation: "abcdeg" },
      repository,
    ),
    PasswordConfirmationMismatchError,
  );

  await assert.rejects(
    resetInternalUserPassword(
      { actor, username: "empleado", password: "corta", passwordConfirmation: "corta" },
      repository,
    ),
    /entre 6 y 128/,
  );
});
