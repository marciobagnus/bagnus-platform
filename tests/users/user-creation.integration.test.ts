import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prisma } from "../../src/lib/prisma.ts";
import {
  createInternalUser,
  createStaffInternalUser,
  loginInternalUser,
} from "../../src/modules/users/application/internal-auth.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

test("ADMIN crea STAFF activo, audita el alta y permite iniciar sesión", async () => {
  const repository = new PrismaInternalAuthRepository();
  const adminUsername = `create-admin-${randomUUID()}`;
  const staffUsername = `created-staff-${randomUUID()}`;
  let adminId: string | undefined;
  let staffId: string | undefined;

  try {
    const admin = await createInternalUser(
      {
        username: adminUsername,
        displayName: "Admin de altas",
        password: "Password-Admin-123!",
        role: "ADMIN",
      },
      repository,
    );
    adminId = admin.id;

    const staff = await createStaffInternalUser(
      {
        actor: admin,
        displayName: "Empleado creado",
        username: staffUsername,
        password: "abcdef",
        passwordConfirmation: "abcdef",
      },
      repository,
    );
    staffId = staff.id;

    assert.equal(staff.role, "STAFF");
    assert.equal(
      await prisma.internalUser.count({ where: { id: staff.id, active: true } }),
      1,
    );
    assert.equal(
      await prisma.internalUserCreationAudit.count({
        where: {
          performedByUserId: admin.id,
          createdUserId: staff.id,
          createdUsername: staffUsername,
        },
      }),
      1,
    );

    const login = await loginInternalUser(
      { username: staffUsername, password: "abcdef" },
      repository,
    );
    assert.equal(login.user.role, "STAFF");
    assert.ok(login.token);
  } finally {
    if (staffId) {
      await prisma.internalUserCreationAudit.deleteMany({ where: { createdUserId: staffId } });
      await prisma.internalSession.deleteMany({ where: { userId: staffId } });
      await prisma.internalUser.delete({ where: { id: staffId } });
    }

    if (adminId) {
      await prisma.internalUserCreationAudit.deleteMany({ where: { performedByUserId: adminId } });
      await prisma.internalSession.deleteMany({ where: { userId: adminId } });
      await prisma.internalUser.delete({ where: { id: adminId } });
    }

    await prisma.$disconnect();
  }
});
