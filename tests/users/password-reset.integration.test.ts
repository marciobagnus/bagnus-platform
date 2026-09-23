import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import {
  createInternalUser,
  loginInternalUser,
  resetInternalUserPassword,
} from "../../src/modules/users/application/internal-auth.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

test("restablecer contraseña invalida sesiones y crea auditoría", async () => {
  const repository = new PrismaInternalAuthRepository();
  const adminUsername = `reset-admin-${randomUUID()}`;
  const targetUsername = `reset-target-${randomUUID()}`;
  let adminId: string | undefined;
  let targetId: string | undefined;

  try {
    const admin = await createInternalUser(
      {
        username: adminUsername,
        displayName: "Administrador de prueba",
        password: "Password-Admin-123!",
        role: "ADMIN",
      },
      repository,
    );
    const target = await createInternalUser(
      {
        username: targetUsername,
        displayName: "Empleado de prueba",
        password: "Password-Target-123!",
        role: "STAFF",
      },
      repository,
    );
    adminId = admin.id;
    targetId = target.id;

    await loginInternalUser(
      { username: targetUsername, password: "Password-Target-123!" },
      repository,
    );
    await loginInternalUser(
      { username: targetUsername, password: "Password-Target-123!" },
      repository,
    );

    assert.equal(
      await prisma.internalSession.count({ where: { userId: target.id } }),
      2,
    );

    await resetInternalUserPassword(
      {
        actor: admin,
        username: targetUsername,
        password: "abcdef",
        passwordConfirmation: "abcdef",
      },
      repository,
    );

    assert.equal(
      await prisma.internalSession.count({ where: { userId: target.id } }),
      0,
    );
    assert.equal(
      await prisma.internalPasswordResetAudit.count({
        where: {
          performedByUserId: admin.id,
          targetUserId: target.id,
        },
      }),
      1,
    );

    await assert.rejects(
      loginInternalUser(
        { username: targetUsername, password: "Password-Target-123!" },
        repository,
      ),
    );

    const newLogin = await loginInternalUser(
      { username: targetUsername, password: "abcdef" },
      repository,
    );
    assert.ok(newLogin.token);

    const adminLogin = await loginInternalUser(
      { username: adminUsername, password: "Password-Admin-123!" },
      repository,
    );
    assert.equal(
      await prisma.internalSession.count({ where: { userId: admin.id } }),
      1,
    );

    await resetInternalUserPassword(
      {
        actor: admin,
        username: adminUsername,
        password: "ghijkl",
        passwordConfirmation: "ghijkl",
      },
      repository,
    );

    assert.equal(
      await prisma.internalSession.count({ where: { userId: admin.id } }),
      0,
    );
    assert.equal(
      await prisma.internalPasswordResetAudit.count({
        where: {
          performedByUserId: admin.id,
          targetUserId: admin.id,
        },
      }),
      1,
    );
    await assert.rejects(
      loginInternalUser(
        { username: adminUsername, password: "Password-Admin-123!" },
        repository,
      ),
    );
    const newAdminLogin = await loginInternalUser(
      { username: adminUsername, password: "ghijkl" },
      repository,
    );
    assert.ok(newAdminLogin.token);
    assert.notEqual(newAdminLogin.token, adminLogin.token);
  } finally {
    if (targetId) {
      await prisma.internalPasswordResetAudit.deleteMany({
        where: { targetUserId: targetId },
      });
      await prisma.internalSession.deleteMany({ where: { userId: targetId } });
      await prisma.internalUser.delete({ where: { id: targetId } });
    }

    if (adminId) {
      await prisma.internalPasswordResetAudit.deleteMany({
        where: { performedByUserId: adminId },
      });
      await prisma.internalSession.deleteMany({ where: { userId: adminId } });
      await prisma.internalUser.delete({ where: { id: adminId } });
    }

    await prisma.$disconnect();
  }
});
