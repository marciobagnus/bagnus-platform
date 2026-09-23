import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createStaffInternalUser,
  UnauthorizedUserAdministrationError,
} from "../../src/modules/users/application/internal-auth.ts";

function repository() {
  const created = [];

  return {
    created,
    async findUsers() {
      return created;
    },
    async findUserByUsername() {
      return null;
    },
    async createStaffUser(input) {
      if (created.some((user) => user.username === input.user.username)) {
        const error = new Error("duplicate");
        error.code = "P2002";
        throw error;
      }

      created.push({
        id: input.user.id,
        username: input.user.username,
        displayName: input.user.displayName,
        role: input.user.role,
      });
    },
    async resetUserPassword() {},
  };
}

const admin = {
  id: "admin-id",
  username: "admin",
  displayName: "Admin",
  role: "ADMIN",
};

test("ADMIN puede crear STAFF con contraseña validada y sin devolver secretos", async () => {
  const userRepository = repository();

  const created = await createStaffInternalUser(
    {
      actor: admin,
      displayName: "Nuevo empleado",
      username: "nuevo.empleado",
      password: "abcdef",
      passwordConfirmation: "abcdef",
    },
    userRepository,
  );

  assert.equal(created.role, "STAFF");
  assert.equal(created.username, "nuevo.empleado");
  assert.equal("passwordHash" in created, false);
  assert.equal(userRepository.created.length, 1);
});

test("STAFF no puede crear usuarios", async () => {
  await assert.rejects(
    createStaffInternalUser(
      {
        actor: {
          ...admin,
          role: "STAFF",
        },
        displayName: "No autorizado",
        username: "no.autorizado",
        password: "Password-Staff-123!",
        passwordConfirmation: "Password-Staff-123!",
      },
      repository(),
    ),
    UnauthorizedUserAdministrationError,
  );
});

test("la creación valida confirmación y contraseña", async () => {
  await assert.rejects(
    createStaffInternalUser(
      {
        actor: admin,
        displayName: "Empleado",
        username: "empleado",
        password: "abcdef",
        passwordConfirmation: "abcdeg",
      },
      repository(),
    ),
    /confirmación de contraseña no coincide/,
  );

  await assert.rejects(
    createStaffInternalUser(
      {
        actor: admin,
        displayName: "Empleado",
        username: "empleado",
        password: "corta",
        passwordConfirmation: "corta",
      },
      repository(),
    ),
    /entre 6 y 128/,
  );
});
