import {
  createInternalUser,
} from "../src/modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";

import type {
  InternalUserRole,
} from "../src/modules/users/domain/internal-user-role.ts";

import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const username =
    process.env.BAGNUS_USER_USERNAME;

  const displayName =
    process.env.BAGNUS_USER_DISPLAY_NAME;

  const password =
    process.env.BAGNUS_USER_PASSWORD;

  const role =
    process.env.BAGNUS_USER_ROLE;

  if (
    !username ||
    !displayName ||
    !password ||
    (role !== "ADMIN" && role !== "STAFF")
  ) {
    throw new Error(
      "Configurá BAGNUS_USER_USERNAME, BAGNUS_USER_DISPLAY_NAME, BAGNUS_USER_PASSWORD y BAGNUS_USER_ROLE.",
    );
  }

  const repository =
    new PrismaInternalAuthRepository();

  const user = await createInternalUser(
    {
      username,
      displayName,
      password,
      role: role as InternalUserRole,
    },
    repository,
  );

  console.log(
    `Usuario creado: ${user.username} (${user.role})`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}