import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";

import {
  createInternalUser,
  getCurrentInternalUser,
  InvalidCredentialsError,
  loginInternalUser,
  logoutInternalUser,
} from "../../src/modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

test(
  "crea un usuario, inicia sesión y cierra sesión",
  async () => {
    const repository =
      new PrismaInternalAuthRepository();

    const username = `test-${randomUUID()}`;

    try {
      const created = await createInternalUser(
        {
          username,
          displayName: "Usuario de prueba",
          password: "Password-Test-123!",
          role: "ADMIN",
        },
        repository,
      );

      assert.equal(
        created.username,
        username,
      );

      await assert.rejects(
        loginInternalUser(
          {
            username,
            password: "contraseña-incorrecta",
          },
          repository,
        ),
        InvalidCredentialsError,
      );

      const login = await loginInternalUser(
        {
          username,
          password: "Password-Test-123!",
        },
        repository,
      );

      assert.ok(login.token);

      assert.equal(
        login.user.role,
        "ADMIN",
      );

      // Solo se guarda el hash del token,
      // nunca el token original.
      const savedSession =
        await prisma.internalSession.findFirst({
          where: {
            userId: created.id,
          },
        });

      assert.ok(savedSession);

      assert.notEqual(
        savedSession.tokenHash,
        login.token,
      );

      const current =
        await getCurrentInternalUser(
          login.token,
          repository,
        );

      assert.ok(current);

      assert.equal(
        current.id,
        created.id,
      );

      await logoutInternalUser(
        login.token,
        repository,
      );

      const afterLogout =
        await getCurrentInternalUser(
          login.token,
          repository,
        );

      assert.equal(
        afterLogout,
        null,
      );
    } finally {
      const user =
        await prisma.internalUser.findUnique({
          where: { username },
          select: { id: true },
        });

      if (user) {
        await prisma.internalSession.deleteMany({
          where: { userId: user.id },
        });

        await prisma.internalUser.delete({
          where: { id: user.id },
        });
      }

      await prisma.$disconnect();
    }
  },
);